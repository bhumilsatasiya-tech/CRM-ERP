<?php

namespace Modules\Settings\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Settings\Models\Sequence;
use RuntimeException;

class SequenceService
{
    /**
     * Atomically increment the sequence and return the formatted document number.
     * Safe under concurrent writes — wraps in transaction with FOR UPDATE row lock.
     *
     * If `$userCode` is provided (non-empty), that value is returned verbatim and
     * the sequence counter is advanced past its embedded number so the next
     * auto-pick continues from there.
     *
     * @throws RuntimeException if the sequence does not exist or is inactive.
     */
    public function next(int $companyId, string $docType, ?string $userCode = null): string
    {
        $userCode = $userCode !== null ? trim($userCode) : null;

        return DB::transaction(function () use ($companyId, $docType, $userCode) {
            $seq = Sequence::query()
                ->where('company_id', $companyId)
                ->where('doc_type', $docType)
                ->lockForUpdate()
                ->first();

            if (! $seq) {
                throw new RuntimeException("No sequence configured for {$docType} on company {$companyId}.");
            }
            if (! $seq->is_active) {
                throw new RuntimeException("Sequence {$docType} is inactive on company {$companyId}.");
            }

            $now = Carbon::now();

            if ($userCode !== null && $userCode !== '') {
                // User typed their own code. Advance the counter if their number is higher.
                if (preg_match_all('/\d+/', $userCode, $m) && !empty($m[0])) {
                    $userNumber = (int) end($m[0]);
                    if ($userNumber > (int) $seq->current_number) {
                        $seq->current_number = $userNumber;
                        $seq->save();
                    }
                }
                return $userCode;
            }

            // Apply periodic reset if needed
            $needsReset = $this->needsReset($seq, $now);
            if ($needsReset) {
                $seq->current_number = 0;
                $seq->last_reset_at  = $now->toDateString();
            }

            $seq->current_number += 1;
            $seq->save();

            return $this->format($seq, $now);
        });
    }

    /** Preview the next number without consuming it. */
    public function previewNext(Sequence $seq): string
    {
        $now = Carbon::now();
        $currentNumber = $this->needsReset($seq, $now) ? 1 : ($seq->current_number + 1);

        $clone = clone $seq;
        $clone->current_number = $currentNumber;

        return $this->format($clone, $now);
    }

    /** Preview by docType — returns null if no sequence configured. */
    public function previewByDocType(int $companyId, string $docType): ?string
    {
        $seq = Sequence::query()
            ->where('company_id', $companyId)
            ->where('doc_type', $docType)
            ->first();
        return $seq ? $this->previewNext($seq) : null;
    }

    /**
     * Format a code for $docType using a fixed family number — used by companion docs
     * (e.g. Packing List + Tax Invoice that should share the parent EI's running number).
     * Returns e.g. "PL/2026/00042" given $number=42.
     */
    public function formatWithNumber(int $companyId, string $docType, int $number): ?string
    {
        $seq = Sequence::query()
            ->where('company_id', $companyId)
            ->where('doc_type', $docType)
            ->first();
        if (!$seq) return null;

        $clone = clone $seq;
        $clone->current_number = $number;
        return $this->format($clone, Carbon::now());
    }

    /** Extract the numeric "family" portion from a generated code (e.g. "EI/2026/00042" -> 42). */
    public static function extractFamilyNumber(string $code): ?int
    {
        if (!preg_match_all('/\d+/', $code, $m) || empty($m[0])) return null;
        return (int) end($m[0]);
    }

    private function needsReset(Sequence $seq, Carbon $now): bool
    {
        if ($seq->reset_period === Sequence::RESET_NEVER) return false;
        if (! $seq->last_reset_at) return true;

        if ($seq->reset_period === Sequence::RESET_YEARLY) {
            return $seq->last_reset_at->year !== $now->year;
        }
        if ($seq->reset_period === Sequence::RESET_MONTHLY) {
            return $seq->last_reset_at->year !== $now->year
                || $seq->last_reset_at->month !== $now->month;
        }
        return false;
    }

    private function format(Sequence $seq, Carbon $now): string
    {
        $number = str_pad((string) $seq->current_number, $seq->padding, '0', STR_PAD_LEFT);

        return strtr($seq->format ?: '{prefix}/{year}/{number}', [
            '{prefix}'      => $seq->prefix ?? '',
            '{suffix}'      => $seq->suffix ?? '',
            '{number}'      => $number,
            '{year}'        => (string) $now->year,
            '{year_short}'  => (string) ($now->year % 100),
            '{month}'       => str_pad((string) $now->month, 2, '0', STR_PAD_LEFT),
            '{day}'         => str_pad((string) $now->day, 2, '0', STR_PAD_LEFT),
        ]);
    }
}
