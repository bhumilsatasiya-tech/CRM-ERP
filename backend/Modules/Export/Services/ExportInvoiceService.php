<?php

namespace Modules\Export\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\ExportInvoiceItem;
use Modules\Export\Models\ShippingBill;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class ExportInvoiceService
{
    public function __construct(
        private SequenceService $sequences,
        private PackingListService $packingService,
        private TaxInvoiceService $taxInvoiceService,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return ExportInvoice::query()
            ->with(['partner:id,code,name'])
            ->withCount(['items', 'shippingBills'])
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['partner_id'] ?? null), fn(Builder $q, $v) => $q->where('partner_id', (int) $v))
            ->orderByDesc('invoice_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): ExportInvoice
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'export_invoice', $header['code'] ?? null);
            $ei = ExportInvoice::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => ExportInvoice::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'USD',
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($ei, $lines);
            $this->recalc($ei);
            $ei->refresh()->load('items.product', 'partner');

            // Auto-generate companion documents (Packing List for customs, Tax Invoice for GST).
            // Failures are logged but don't block EI creation — user can re-generate via the EI page.
            try { $this->packingService->createFromExportInvoice($ei, $actorId); }
            catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('Auto-PL generation failed for EI '.$ei->code.': '.$e->getMessage()); }
            try { $this->taxInvoiceService->createFromExportInvoice($ei, $actorId); }
            catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('Auto-TI generation failed for EI '.$ei->code.': '.$e->getMessage()); }

            return $ei->fresh(['items', 'partner', 'packingLists', 'taxInvoices']);
        });
    }

    /**
     * Re-generate companion docs for an existing EI. Creates whichever is missing,
     * leaves existing ones alone (idempotent via createFromExportInvoice).
     */
    public function ensureCompanionDocs(ExportInvoice $ei, ?int $actorId = null): ExportInvoice
    {
        $ei->loadMissing('items.product');
        try { $this->packingService->createFromExportInvoice($ei, $actorId); }
        catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('Companion PL generation failed for EI '.$ei->code.': '.$e->getMessage()); throw $e; }
        try { $this->taxInvoiceService->createFromExportInvoice($ei, $actorId); }
        catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('Companion TI generation failed for EI '.$ei->code.': '.$e->getMessage()); throw $e; }
        return $ei->fresh(['items', 'partner', 'packingLists', 'taxInvoices']);
    }

    public function update(ExportInvoice $ei, array $header, ?array $lines, ?int $actorId = null): ExportInvoice
    {
        if (! $ei->isEditable()) throw new RuntimeException('Only draft export invoices can be edited.');
        return DB::transaction(function () use ($ei, $header, $lines, $actorId) {
            $ei->fill($header); $ei->updated_by = $actorId; $ei->save();
            if (is_array($lines)) $this->syncLines($ei, $lines);
            $this->recalc($ei);
            return $ei->fresh(['items', 'partner']);
        });
    }

    public function delete(ExportInvoice $ei): void
    {
        if (! $ei->isEditable()) throw new RuntimeException('Only draft export invoices can be deleted.');
        DB::transaction(fn() => $ei->delete());
    }

    /**
     * Posting an export invoice does NOT touch stock — goods leave the warehouse on Shipping Bill dispatch.
     * Posting just locks the invoice and starts the AR clock.
     */
    public function post(ExportInvoice $ei, ?int $actorId = null): ExportInvoice
    {
        if ($ei->status !== ExportInvoice::STATUS_DRAFT) throw new RuntimeException('Only draft export invoices can be posted.');
        if (! $ei->items()->exists()) throw new RuntimeException('Cannot post an export invoice with no lines.');
        $ei->forceFill([
            'status'    => ExportInvoice::STATUS_POSTED,
            'posted_at' => now(),
            'balance'   => (float) $ei->total - (float) $ei->paid_amount,
            'updated_by'=> $actorId,
        ])->save();
        return $ei;
    }

    public function cancel(ExportInvoice $ei, ?string $reason = null, ?int $actorId = null): ExportInvoice
    {
        if ($ei->status === ExportInvoice::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        // Block cancel if there are non-cancelled shipping bills (those reverse stock first)
        $activeShipping = $ei->shippingBills()->where('status', '!=', ShippingBill::STATUS_CANCELLED)->exists();
        if ($activeShipping) {
            throw new RuntimeException('Cancel all shipping bills first before cancelling the export invoice.');
        }
        $ei->forceFill([
            'status' => ExportInvoice::STATUS_CANCELLED,
            'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
        ])->save();
        return $ei;
    }

    /**
     * Apply a payment-in-INR to the export invoice (called by IRM module).
     * Recomputes status. Returns the refreshed invoice.
     */
    public function applyPaymentInr(ExportInvoice $ei, float $amountInr, ?int $actorId = null): ExportInvoice
    {
        return DB::transaction(function () use ($ei, $amountInr, $actorId) {
            $newPaid    = round((float) $ei->paid_amount + $amountInr, 2);
            $newBalance = round((float) $ei->total - $newPaid, 2);
            $newStatus  = $newBalance <= 0.0001 ? ExportInvoice::STATUS_PAID : ExportInvoice::STATUS_PARTIALLY_PAID;
            $ei->forceFill([
                'paid_amount' => $newPaid,
                'balance'     => $newBalance,
                'status'      => $newStatus,
                'updated_by'  => $actorId,
            ])->save();
            return $ei;
        });
    }

    public function reversePaymentInr(ExportInvoice $ei, float $amountInr, ?int $actorId = null): ExportInvoice
    {
        return DB::transaction(function () use ($ei, $amountInr, $actorId) {
            $newPaid    = max(0.0, round((float) $ei->paid_amount - $amountInr, 2));
            $newBalance = round((float) $ei->total - $newPaid, 2);
            $newStatus  = $newPaid <= 0.0001 ? ExportInvoice::STATUS_POSTED : ($newBalance <= 0.0001 ? ExportInvoice::STATUS_PAID : ExportInvoice::STATUS_PARTIALLY_PAID);
            $ei->forceFill([
                'paid_amount' => $newPaid,
                'balance'     => $newBalance,
                'status'      => $newStatus,
                'updated_by'  => $actorId,
            ])->save();
            return $ei;
        });
    }

    private function syncLines(ExportInvoice $ei, array $lines): void
    {
        $ei->items()->delete();
        foreach ($lines as $row) {
            $qty  = (float) $row['qty'];
            $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0);
            $tax  = (float) ($row['tax_rate'] ?? 0);
            $sub  = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            ExportInvoiceItem::create([
                'export_invoice_id'    => $ei->id,
                'sales_order_item_id'  => $row['sales_order_item_id'] ?? null,
                'product_id'           => $row['product_id'],
                'hsn_code'             => $row['hsn_code'] ?? null,
                'qty'                  => $qty,
                'shipper_qty'          => isset($row['shipper_qty']) ? (float) $row['shipper_qty'] : null,
                'shipper_unit'         => $row['shipper_unit'] ?? null,
                'rate'                 => $rate,
                'discount_pct'         => $disc, 'tax_rate' => $tax,
                'line_subtotal'        => $sub, 'tax_amount' => $taxAmount, 'line_total' => $sub + $taxAmount,
                'batch_no'             => $row['batch_no'] ?? null,
                'expiry_date'          => $row['expiry_date'] ?? null,
                'shipped_qty'          => 0,
                'notes'                => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(ExportInvoice $ei): void
    {
        $items = $ei->items()->get();
        $sub   = $items->sum('line_subtotal');
        $tax   = $items->sum('tax_amount');
        $extra = (float) $ei->shipping
               + (float) $ei->freight_charge
               + (float) $ei->packaging_charge
               + (float) $ei->development_charge;
        $total = $sub + $tax + $extra - (float) $ei->discount;
        $ei->forceFill([
            'subtotal'   => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total'      => round($total, 2),
            'balance'    => round($total - (float) $ei->paid_amount, 2),
        ])->save();
    }
}

