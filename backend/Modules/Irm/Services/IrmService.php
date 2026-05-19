<?php

namespace Modules\Irm\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Services\ExportInvoiceService;
use Modules\Irm\Events\BankRealizationRecorded;
use Modules\Irm\Events\IrmReceived;
use Modules\Irm\Models\BankRealization;
use Modules\Irm\Models\Irm;
use Modules\Irm\Models\IrmAllocation;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class IrmService
{
    public function __construct(private ExportInvoiceService $exportInvoices, private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Irm::query()
            ->with(['partner:id,code,name', 'exportInvoice:id,code,partner_id,total,paid_amount,balance,currency'])
            ->withCount(['allocations', 'realizations'])
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('bank_ref_no', 'like', $like)->orWhere('remitter_name', 'like', $like);
            }))
            ->when(($filters['status'] ?? '') !== '',  fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['purpose'] ?? '') !== '', fn(Builder $q) => $q->where('purpose', $filters['purpose']))
            ->when(($filters['partner_id'] ?? null),   fn(Builder $q, $v) => $q->where('partner_id', (int) $v))
            ->when(($filters['export_invoice_id'] ?? null), fn(Builder $q, $v) => $q->where('export_invoice_id', (int) $v))
            ->orderByDesc('irm_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    /**
     * Create an IRM. Two modes:
     *  - 'advance': partner_id required, no EI. Outstanding = full amount.
     *  - 'against_invoice' (legacy): export_invoice_id required, auto-allocates the full amount and applies payment.
     */
    public function create(int $companyId, array $data, ?int $actorId = null): Irm
    {
        return DB::transaction(function () use ($companyId, $data, $actorId) {
            $amountFcy = (float) $data['irm_amount_fcy'];
            $rate      = (float) ($data['exchange_rate'] ?? 1);
            $amountInr = round($amountFcy * $rate, 2);

            $partnerId = $data['partner_id'] ?? null;
            $eiId      = $data['export_invoice_id'] ?? null;

            // Default to ADVANCE unless caller explicitly opts into legacy against_invoice mode WITH an EI.
            $purpose = $data['purpose']
                ?? (($eiId) ? Irm::PURPOSE_AGAINST_INVOICE : Irm::PURPOSE_ADVANCE);

            // Resolve partner from EI if not provided (back-compat)
            if (!$partnerId && $eiId) {
                $ei = ExportInvoice::findOrFail($eiId);
                $partnerId = $ei->partner_id;
            }
            if (!$partnerId) {
                throw new RuntimeException('IRM requires a partner. Pick the client whose payment this is.');
            }
            if ($purpose === Irm::PURPOSE_AGAINST_INVOICE && !$eiId) {
                throw new RuntimeException('Against-invoice mode requires export_invoice_id (legacy path).');
            }

            $code = $this->sequences->next($companyId, 'irm', $data['code'] ?? null);

            $irm = Irm::create([
                'company_id'             => $companyId,
                'code'                   => $code,
                'export_invoice_id'      => $eiId,
                'partner_id'             => $partnerId,
                'purpose'                => $purpose,
                'purchase_order_ref'     => $data['purchase_order_ref'] ?? null,
                'proforma_invoice_no'    => $data['proforma_invoice_no'] ?? null,
                'bank_name'              => $data['bank_name'] ?? null,
                'remitter_name'          => $data['remitter_name'] ?? null,
                'bank_ref_no'            => $data['bank_ref_no'] ?? null,
                'irm_date'               => $data['irm_date'],
                'irm_amount_fcy'         => $amountFcy,
                'outstanding_amount_fcy' => $amountFcy,
                'irm_currency'           => $data['irm_currency'] ?? 'USD',
                'exchange_rate'          => $rate,
                'irm_amount_inr'         => $amountInr,
                'outstanding_amount_inr' => $amountInr,
                'purpose_code'           => $data['purpose_code'] ?? null,
                'status'                 => Irm::STATUS_RECEIVED,
                'notes'                  => $data['notes'] ?? null,
                'created_by'             => $actorId,
                'updated_by'             => $actorId,
            ]);

            // Legacy path: against_invoice with EI → auto-allocate full amount
            if ($purpose === Irm::PURPOSE_AGAINST_INVOICE && $eiId) {
                $this->allocate($irm, [
                    'export_invoice_id' => $eiId,
                    'amount_fcy'        => $amountFcy,
                    'allocation_date'   => $data['irm_date'],
                    'exchange_rate'     => $rate,
                    'is_full_realization' => true,
                ], $actorId);
            }

            $fresh = $irm->fresh(['partner', 'exportInvoice', 'allocations']);
            event(new IrmReceived($fresh));
            return $fresh;
        });
    }

    /**
     * Allocate part of an IRM's outstanding balance against an Export Invoice.
     * Decreases IRM outstanding, applies INR to EI's paid_amount, fires payment event.
     */
    public function allocate(Irm $irm, array $data, ?int $actorId = null): IrmAllocation
    {
        if (!$irm->isOpen()) {
            throw new RuntimeException('Cannot allocate from a closed or cancelled IRM.');
        }

        return DB::transaction(function () use ($irm, $data, $actorId) {
            $eiId      = (int) $data['export_invoice_id'];
            $amountFcy = round((float) $data['amount_fcy'], 2);
            $rate      = (float) ($data['exchange_rate'] ?? $irm->exchange_rate);
            $amountInr = round($amountFcy * $rate, 2);

            if ($amountFcy <= 0) {
                throw new RuntimeException('Allocation amount must be greater than zero.');
            }
            if ($amountFcy > (float) $irm->outstanding_amount_fcy + 0.01) {
                throw new RuntimeException(sprintf(
                    'Allocation %.2f %s exceeds IRM outstanding %.2f %s.',
                    $amountFcy, $irm->irm_currency, $irm->outstanding_amount_fcy, $irm->irm_currency
                ));
            }

            $ei = ExportInvoice::findOrFail($eiId);

            // Partner mismatch is allowed only if explicitly flagged as a third-party payment
            // (e.g., a parent company / consolidator pays the IRM on behalf of the EI buyer).
            $isThirdParty = (bool) ($data['is_third_party_payment'] ?? false);
            if ($irm->partner_id && $ei->partner_id && (int) $irm->partner_id !== (int) $ei->partner_id && !$isThirdParty) {
                throw new RuntimeException('IRM partner does not match the export invoice partner. Pass is_third_party_payment=true to allow third-party closure.');
            }

            $alloc = IrmAllocation::create([
                'irm_id'                 => $irm->id,
                'export_invoice_id'      => $ei->id,
                'shipping_bill_id'       => $data['shipping_bill_id'] ?? null,
                'amount_fcy'             => $amountFcy,
                'amount_inr'             => $amountInr,
                'allocation_date'        => $data['allocation_date'] ?? now()->toDateString(),
                'exchange_rate'          => $rate,
                'is_full_realization'    => (bool) ($data['is_full_realization'] ?? false),
                'is_third_party_payment' => $isThirdParty,
                'notes'                  => $data['notes'] ?? null,
                'created_by'             => $actorId,
            ]);

            // Apply payment effect on the EI
            $this->exportInvoices->applyPaymentInr($ei, $amountInr, $actorId);

            $this->recomputeOutstanding($irm, $actorId);
            return $alloc->fresh(['exportInvoice']);
        });
    }

    /**
     * Reverse an allocation — restores IRM outstanding and reverses the EI's paid_amount.
     */
    public function deallocate(IrmAllocation $alloc, ?int $actorId = null): void
    {
        DB::transaction(function () use ($alloc, $actorId) {
            $irm = $alloc->irm;
            if (!$irm->isOpen()) {
                throw new RuntimeException('Cannot de-allocate from a closed or cancelled IRM.');
            }
            $ei = $alloc->exportInvoice;
            if ($ei) {
                $this->exportInvoices->reversePaymentInr($ei, (float) $alloc->amount_inr, $actorId);
            }
            $alloc->delete();
            $this->recomputeOutstanding($irm, $actorId);
        });
    }

    /**
     * Recompute outstanding amounts and status from existing allocations.
     */
    public function recomputeOutstanding(Irm $irm, ?int $actorId = null): Irm
    {
        $allocFcy = (float) $irm->allocations()->sum('amount_fcy');
        $allocInr = (float) $irm->allocations()->sum('amount_inr');
        $outFcy   = round((float) $irm->irm_amount_fcy - $allocFcy, 2);
        $outInr   = round((float) $irm->irm_amount_inr - $allocInr, 2);

        // Don't override CLOSED / CANCELLED statuses
        $newStatus = $irm->status;
        if (in_array($irm->status, [Irm::STATUS_RECEIVED, Irm::STATUS_PARTIALLY_ALLOCATED, Irm::STATUS_ALLOCATED], true)) {
            if ($outFcy <= 0.005)        $newStatus = Irm::STATUS_ALLOCATED;
            elseif ($allocFcy > 0.005)   $newStatus = Irm::STATUS_PARTIALLY_ALLOCATED;
            else                         $newStatus = Irm::STATUS_RECEIVED;
        }

        $irm->forceFill([
            'outstanding_amount_fcy' => max(0, $outFcy),
            'outstanding_amount_inr' => max(0, $outInr),
            'status'                 => $newStatus,
            'updated_by'             => $actorId,
        ])->save();

        return $irm->fresh(['partner', 'exportInvoice', 'allocations.exportInvoice']);
    }

    public function update(Irm $irm, array $data, ?int $actorId = null): Irm
    {
        if (in_array($irm->status, [Irm::STATUS_CLOSED, Irm::STATUS_CANCELLED], true)) {
            throw new RuntimeException('Cannot edit a '.$irm->status.' IRM.');
        }
        if ($irm->allocations()->exists()) {
            throw new RuntimeException('IRM has allocations — de-allocate first before editing core fields.');
        }

        return DB::transaction(function () use ($irm, $data, $actorId) {
            $amountFcy = (float) ($data['irm_amount_fcy'] ?? $irm->irm_amount_fcy);
            $rate      = (float) ($data['exchange_rate'] ?? $irm->exchange_rate);
            $amountInr = round($amountFcy * $rate, 2);

            $irm->fill(array_merge($data, [
                'irm_amount_fcy'         => $amountFcy,
                'outstanding_amount_fcy' => $amountFcy,
                'exchange_rate'          => $rate,
                'irm_amount_inr'         => $amountInr,
                'outstanding_amount_inr' => $amountInr,
                'updated_by'             => $actorId,
            ]));
            $irm->save();

            return $irm->fresh(['partner', 'exportInvoice', 'allocations']);
        });
    }

    /**
     * Bank closure: records the realized INR (after commission/tds), marks IRM as closed.
     */
    public function closeWithRealization(Irm $irm, array $data, ?int $actorId = null): BankRealization
    {
        if ($irm->status === Irm::STATUS_CLOSED)    throw new RuntimeException('IRM already closed.');
        if ($irm->status === Irm::STATUS_CANCELLED) throw new RuntimeException('Cannot close a cancelled IRM.');

        return DB::transaction(function () use ($irm, $data, $actorId) {
            $commission = (float) ($data['commission'] ?? 0);
            $tds        = (float) ($data['tds'] ?? 0);
            $netInr     = (float) ($data['net_inr'] ?? max(0, (float) $irm->irm_amount_inr - $commission - $tds));

            $r = BankRealization::create([
                'company_id'       => $irm->company_id,
                'irm_id'           => $irm->id,
                'realization_date' => $data['realization_date'] ?? now()->toDateString(),
                'bank_ref'         => $data['bank_ref'] ?? null,
                'commission'       => $commission,
                'tds'              => $tds,
                'net_inr'          => $netInr,
                'notes'            => $data['notes'] ?? null,
                'created_by'       => $actorId,
            ]);

            $irm->forceFill([
                'status'     => Irm::STATUS_CLOSED,
                'updated_by' => $actorId,
            ])->save();

            event(new BankRealizationRecorded($r->fresh(['irm'])));
            return $r;
        });
    }

    public function cancel(Irm $irm, ?string $reason = null, ?int $actorId = null): Irm
    {
        if ($irm->status === Irm::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');

        return DB::transaction(function () use ($irm, $reason, $actorId) {
            // Reverse all live allocations first
            foreach ($irm->allocations as $alloc) {
                if ($alloc->exportInvoice) {
                    $this->exportInvoices->reversePaymentInr($alloc->exportInvoice, (float) $alloc->amount_inr, $actorId);
                }
                $alloc->delete();
            }
            $irm->forceFill([
                'status'     => Irm::STATUS_CANCELLED,
                'notes'      => trim((string) $irm->notes . ($reason ? "\nCancelled: {$reason}" : '')),
                'updated_by' => $actorId,
            ])->save();
            return $irm->fresh(['partner', 'exportInvoice', 'allocations']);
        });
    }

    public function delete(Irm $irm): void
    {
        if ($irm->status !== Irm::STATUS_CANCELLED) {
            throw new RuntimeException('Only cancelled IRMs can be deleted. Cancel first.');
        }
        DB::transaction(fn() => $irm->delete());
    }
}
