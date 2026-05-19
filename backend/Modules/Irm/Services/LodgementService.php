<?php

namespace Modules\Irm\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Irm\Models\Irm;
use Modules\Irm\Models\IrmAllocation;
use Modules\Irm\Models\Lodgement;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class LodgementService
{
    public function __construct(
        private SequenceService $sequences,
        private IrmService $irmService,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Lodgement::query()
            ->with(['partner:id,code,name'])
            ->withCount('allocations')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('bank_receipt_no', 'like', $like);
            }))
            ->when(($filters['status'] ?? '') !== '',  fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['partner_id'] ?? null),   fn(Builder $q, $v) => $q->where('partner_id', (int) $v))
            ->orderByDesc('lodgement_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    /**
     * Create a draft Lodgement and the underlying allocations in one go.
     * Each row in $rows: ['irm_id','export_invoice_id','amount_fcy','exchange_rate','is_full_realization','notes']
     */
    public function create(int $companyId, array $header, array $rows, ?int $actorId = null): Lodgement
    {
        if (count($rows) === 0) throw new RuntimeException('A lodgement needs at least one mapping row.');

        return DB::transaction(function () use ($companyId, $header, $rows, $actorId) {
            $code = $this->sequences->next($companyId, 'lodgement', $header['code'] ?? null);

            $lodge = Lodgement::create([
                'company_id'        => $companyId,
                'code'              => $code,
                'partner_id'        => $header['partner_id'] ?? null,
                'lodgement_date'    => $header['lodgement_date'] ?? now()->toDateString(),
                'bank_receipt_no'   => $header['bank_receipt_no'] ?? null,
                'bank_receipt_date' => $header['bank_receipt_date'] ?? null,
                'status'            => Lodgement::STATUS_DRAFT,
                'notes'             => $header['notes'] ?? null,
                'created_by'        => $actorId,
                'updated_by'        => $actorId,
            ]);

            foreach ($rows as $r) {
                $irm = Irm::findOrFail((int) $r['irm_id']);
                $isThirdParty = (bool) ($r['is_third_party_payment'] ?? false);
                // Auto-detect third party if IRM partner differs from lodgement partner
                if ($lodge->partner_id && $irm->partner_id && (int) $lodge->partner_id !== (int) $irm->partner_id) {
                    $isThirdParty = true;
                }
                $alloc = $this->irmService->allocate($irm, [
                    'export_invoice_id'      => $r['export_invoice_id'],
                    'amount_fcy'             => $r['amount_fcy'],
                    'exchange_rate'          => $r['exchange_rate'] ?? null,
                    'allocation_date'        => $header['lodgement_date'] ?? now()->toDateString(),
                    'is_full_realization'    => (bool) ($r['is_full_realization'] ?? false),
                    'is_third_party_payment' => $isThirdParty,
                    'notes'                  => $r['notes'] ?? null,
                ], $actorId);

                $alloc->forceFill([
                    'lodgement_id'       => $lodge->id,
                    'utilization_status' => 'utilised',
                ])->save();
            }

            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    /** Add another mapping row to an existing draft/submitted lodgement. */
    public function addRow(Lodgement $lodge, array $r, ?int $actorId = null): Lodgement
    {
        if (! $lodge->isEditable()) throw new RuntimeException('Lodgement is no longer editable.');
        return DB::transaction(function () use ($lodge, $r, $actorId) {
            $irm = Irm::findOrFail((int) $r['irm_id']);
            $isThirdParty = (bool) ($r['is_third_party_payment'] ?? false);
            if ($lodge->partner_id && $irm->partner_id && (int) $lodge->partner_id !== (int) $irm->partner_id) {
                $isThirdParty = true;
            }
            $alloc = $this->irmService->allocate($irm, [
                'export_invoice_id'      => $r['export_invoice_id'],
                'amount_fcy'             => $r['amount_fcy'],
                'exchange_rate'          => $r['exchange_rate'] ?? null,
                'allocation_date'        => $r['allocation_date'] ?? $lodge->lodgement_date?->toDateString() ?? now()->toDateString(),
                'is_full_realization'    => (bool) ($r['is_full_realization'] ?? false),
                'is_third_party_payment' => $isThirdParty,
                'notes'                  => $r['notes'] ?? null,
            ], $actorId);
            $alloc->forceFill(['lodgement_id' => $lodge->id, 'utilization_status' => 'utilised'])->save();
            $lodge->touch();
            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    /** Remove a row — fully reverses the allocation. */
    public function removeRow(IrmAllocation $alloc, ?int $actorId = null): void
    {
        if ($alloc->lodgement && $alloc->lodgement->isFinal()) {
            throw new RuntimeException('Lodgement is final — use mark-row to flag the row instead of removing.');
        }
        $this->irmService->deallocate($alloc, $actorId);
    }

    /**
     * Mark an allocation utilised / unutilised / rejected.
     * - utilised: leaves the allocation as-is (default state when bank accepts)
     * - unutilised or rejected: reverses the allocation (returns IRM outstanding + EI balance)
     */
    public function markRow(IrmAllocation $alloc, string $status, ?string $note = null, ?int $actorId = null): void
    {
        $allowed = ['pending', 'utilised', 'unutilised', 'rejected'];
        if (! in_array($status, $allowed, true)) throw new RuntimeException('Invalid status.');

        if (in_array($status, ['unutilised', 'rejected'], true)) {
            // Reverse the underlying allocation entirely
            $this->irmService->deallocate($alloc, $actorId);
            return;
        }

        // utilised / pending: just stamp
        $alloc->forceFill([
            'utilization_status' => $status,
            'utilization_note'   => $note,
        ])->save();
    }

    public function update(Lodgement $lodge, array $data, ?int $actorId = null): Lodgement
    {
        if (! $lodge->isEditable()) throw new RuntimeException('Lodgement is no longer editable.');
        return DB::transaction(function () use ($lodge, $data, $actorId) {
            $lodge->fill(array_intersect_key($data, array_flip([
                'lodgement_date', 'bank_receipt_no', 'bank_receipt_date', 'partner_id', 'notes',
            ])));
            $lodge->updated_by = $actorId;
            $lodge->save();
            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    public function submit(Lodgement $lodge, ?int $actorId = null): Lodgement
    {
        if ($lodge->status !== Lodgement::STATUS_DRAFT) throw new RuntimeException('Only draft lodgements can be submitted.');
        $lodge->forceFill(['status' => Lodgement::STATUS_SUBMITTED, 'updated_by' => $actorId])->save();
        return $lodge;
    }

    public function accept(Lodgement $lodge, array $data, ?int $actorId = null): Lodgement
    {
        if ($lodge->isFinal()) throw new RuntimeException('Lodgement already finalized.');
        return DB::transaction(function () use ($lodge, $data, $actorId) {
            $lodge->forceFill([
                'status'            => Lodgement::STATUS_ACCEPTED,
                'bank_receipt_no'   => $data['bank_receipt_no'] ?? $lodge->bank_receipt_no,
                'bank_receipt_date' => $data['bank_receipt_date'] ?? $lodge->bank_receipt_date,
                'notes'             => $data['notes'] ?? $lodge->notes,
                'updated_by'        => $actorId,
            ])->save();
            // Stamp every still-pending allocation as utilised
            $lodge->allocations()->where('utilization_status', 'pending')->update(['utilization_status' => 'utilised']);
            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    /**
     * Reject the lodgement: reverses every allocation that hasn't been individually marked utilised.
     * Keeps allocations marked 'utilised' (for partial-acceptance scenarios).
     */
    public function reject(Lodgement $lodge, ?string $reason = null, ?int $actorId = null): Lodgement
    {
        if ($lodge->isFinal()) throw new RuntimeException('Lodgement already finalized.');
        return DB::transaction(function () use ($lodge, $reason, $actorId) {
            foreach ($lodge->allocations()->where('utilization_status', '!=', 'utilised')->get() as $alloc) {
                $this->irmService->deallocate($alloc, $actorId);
            }
            $lodge->forceFill([
                'status'           => Lodgement::STATUS_REJECTED,
                'rejection_reason' => $reason,
                'updated_by'       => $actorId,
            ])->save();
            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    public function cancel(Lodgement $lodge, ?int $actorId = null): Lodgement
    {
        if ($lodge->status === Lodgement::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        return DB::transaction(function () use ($lodge, $actorId) {
            // Reverse every allocation tied to this lodgement
            foreach ($lodge->allocations as $alloc) {
                $this->irmService->deallocate($alloc, $actorId);
            }
            $lodge->forceFill(['status' => Lodgement::STATUS_CANCELLED, 'updated_by' => $actorId])->save();
            return $lodge->fresh(['partner', 'allocations.exportInvoice', 'allocations.irm.partner']);
        });
    }

    public function delete(Lodgement $lodge): void
    {
        if ($lodge->status !== Lodgement::STATUS_CANCELLED) throw new RuntimeException('Only cancelled lodgements can be deleted.');
        DB::transaction(fn() => $lodge->delete());
    }
}
