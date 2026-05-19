<?php

namespace Modules\Finance\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Finance\Models\Account;
use Modules\Finance\Models\JournalEntry;
use Modules\Finance\Models\JournalLine;
use Modules\Settings\Services\SequenceService;
use Modules\Settings\Services\SettingService;
use RuntimeException;

class JournalService
{
    public function __construct(
        private SequenceService $sequences,
        private SettingService $settings,
        private BalanceService $balances,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return JournalEntry::query()
            ->withCount('lines')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['reference_type'] ?? '') !== '', fn(Builder $q) => $q->where('reference_type', $filters['reference_type']))
            ->when(($filters['from'] ?? null), fn(Builder $q, $v) => $q->where('entry_date', '>=', $v))
            ->when(($filters['to']   ?? null), fn(Builder $q, $v) => $q->where('entry_date', '<=', $v))
            ->orderByDesc('entry_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): JournalEntry
    {
        if (count($lines) < 2) {
            throw new RuntimeException('A journal entry needs at least 2 lines.');
        }
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'journal_entry', $header['code'] ?? null);
            $je = JournalEntry::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => JournalEntry::STATUS_DRAFT,
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($je, $lines);
            $this->validateBalanced($je);
            return $je->fresh(['lines.account']);
        });
    }

    public function update(JournalEntry $je, array $header, ?array $lines, ?int $actorId = null): JournalEntry
    {
        if (! $je->isEditable()) throw new RuntimeException('Only draft journal entries can be edited.');
        return DB::transaction(function () use ($je, $header, $lines, $actorId) {
            $je->fill($header); $je->updated_by = $actorId; $je->save();
            if (is_array($lines)) {
                $this->syncLines($je, $lines);
                $this->validateBalanced($je);
            }
            return $je->fresh(['lines.account']);
        });
    }

    public function delete(JournalEntry $je): void
    {
        if (! $je->isEditable()) throw new RuntimeException('Only draft journal entries can be deleted.');
        DB::transaction(fn() => $je->delete());
    }

    public function post(JournalEntry $je, ?int $actorId = null): JournalEntry
    {
        if ($je->status !== JournalEntry::STATUS_DRAFT) {
            throw new RuntimeException('Only draft entries can be posted.');
        }
        $this->validateBalanced($je);
        return DB::transaction(function () use ($je, $actorId) {
            $je->forceFill([
                'status' => JournalEntry::STATUS_POSTED,
                'posted_at' => now(),
                'posted_by' => $actorId,
                'updated_by' => $actorId,
            ])->save();
            $accountIds = $je->lines->pluck('account_id')->unique()->all();
            $this->balances->recompute($je->company_id, $accountIds, $je->entry_date);
            return $je;
        });
    }

    public function cancel(JournalEntry $je, ?string $reason = null, ?int $actorId = null): JournalEntry
    {
        if ($je->status === JournalEntry::STATUS_CANCELLED) {
            throw new RuntimeException('Already cancelled.');
        }
        return DB::transaction(function () use ($je, $reason, $actorId) {
            $je->forceFill([
                'status' => JournalEntry::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancelled_by' => $actorId,
                'cancellation_reason' => $reason,
                'updated_by' => $actorId,
            ])->save();
            // For posted entries, recompute balances to "remove" the effect.
            if ($je->status === JournalEntry::STATUS_POSTED) {
                $accountIds = $je->lines->pluck('account_id')->unique()->all();
                $this->balances->recompute($je->company_id, $accountIds, $je->entry_date);
            }
            return $je;
        });
    }

    /**
     * Idempotent: builds a JE only if no posted JE exists for ($refType, $refId).
     * Posts it immediately. Returns the JE (or null if missing settings).
     */
    public function postFromReference(int $companyId, string $refType, int $refId, string $refNo, string $entryDate, string $narration, array $lineSpecs, ?int $actorId = null): ?JournalEntry
    {
        // Idempotency
        $existing = JournalEntry::where('company_id', $companyId)
            ->where('reference_type', $refType)
            ->where('reference_id', $refId)
            ->where('status', '!=', JournalEntry::STATUS_CANCELLED)
            ->first();
        if ($existing) return $existing;

        // Resolve any account-id placeholders against settings
        $resolved = [];
        foreach ($lineSpecs as $spec) {
            if (! empty($spec['settings_key'])) {
                $accountId = (int) $this->settings->get($spec['settings_key'], 0, null, $companyId);
                if ($accountId <= 0) {
                    Log::warning("Auto-journal skipped: setting '{$spec['settings_key']}' not configured for company {$companyId} on {$refType} #{$refId}.");
                    return null;
                }
                $spec['account_id'] = $accountId;
            }
            unset($spec['settings_key']);
            $resolved[] = $spec;
        }

        $code = $this->sequences->next($companyId, 'journal_entry');
        $je = JournalEntry::create([
            'company_id' => $companyId, 'code' => $code,
            'entry_date' => $entryDate,
            'narration' => $narration,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'reference_no' => $refNo,
            'status' => JournalEntry::STATUS_DRAFT,
            'created_by' => $actorId, 'updated_by' => $actorId,
        ]);
        $this->syncLines($je, $resolved);
        try {
            $this->validateBalanced($je);
        } catch (RuntimeException $e) {
            Log::warning("Auto-journal unbalanced for {$refType} #{$refId}: " . $e->getMessage());
            $je->delete();
            return null;
        }
        return $this->post($je, $actorId);
    }

    private function syncLines(JournalEntry $je, array $lines): void
    {
        $je->lines()->delete();
        $totalD = 0; $totalC = 0;
        foreach ($lines as $row) {
            $debit  = round((float) ($row['debit']  ?? 0), 2);
            $credit = round((float) ($row['credit'] ?? 0), 2);
            if ($debit > 0 && $credit > 0) {
                throw new RuntimeException('A journal line cannot have both debit and credit.');
            }
            if ($debit <= 0 && $credit <= 0) {
                continue; // skip zero rows
            }
            JournalLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => (int) $row['account_id'],
                'debit'            => $debit,
                'credit'           => $credit,
                'narration'        => $row['narration'] ?? null,
            ]);
            $totalD += $debit; $totalC += $credit;
        }
        $je->forceFill([
            'total_debit' => round($totalD, 2),
            'total_credit' => round($totalC, 2),
        ])->save();
    }

    private function validateBalanced(JournalEntry $je): void
    {
        $totalD = (float) $je->lines()->sum('debit');
        $totalC = (float) $je->lines()->sum('credit');
        if (abs($totalD - $totalC) > 0.01) {
            throw new RuntimeException("Journal entry not balanced: debits {$totalD} vs credits {$totalC}.");
        }
        if ($totalD <= 0) {
            throw new RuntimeException('Journal entry has no monetary lines.');
        }
        // Sanity: only leaf accounts (is_group=false) can be posted to.
        $groupAccounts = $je->lines()->whereHas('account', fn($q) => $q->where('is_group', true))->count();
        if ($groupAccounts > 0) {
            throw new RuntimeException('Cannot post to group accounts. Pick leaf accounts only.');
        }
    }
}
