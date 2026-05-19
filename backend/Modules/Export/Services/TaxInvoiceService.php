<?php

namespace Modules\Export\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Export\Models\TaxInvoice;
use Modules\Export\Models\TaxInvoiceItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class TaxInvoiceService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return TaxInvoice::query()
            ->with(['exportInvoice:id,code,partner_id,currency', 'partner:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['export_invoice_id'] ?? null), fn(Builder $q, $v) => $q->where('export_invoice_id', (int) $v))
            ->orderByDesc('invoice_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): TaxInvoice
    {
        if (count($lines) === 0) {
            throw new RuntimeException('A tax invoice must have at least one line.');
        }
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'tax_invoice', $header['code'] ?? null);
            $ti = TaxInvoice::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => TaxInvoice::STATUS_DRAFT,
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($ti, $lines);
            $this->recalc($ti);
            return $ti->fresh(['items.product', 'partner', 'exportInvoice']);
        });
    }

    public function update(TaxInvoice $ti, array $header, ?array $lines, ?int $actorId = null): TaxInvoice
    {
        if (! $ti->isEditable()) throw new RuntimeException('Only draft tax invoices can be edited.');
        return DB::transaction(function () use ($ti, $header, $lines, $actorId) {
            $ti->fill($header);
            $ti->updated_by = $actorId;
            $ti->save();
            if (is_array($lines)) $this->syncLines($ti, $lines);
            $this->recalc($ti);
            return $ti->fresh(['items.product', 'partner', 'exportInvoice']);
        });
    }

    public function delete(TaxInvoice $ti): void
    {
        if (! $ti->isEditable()) throw new RuntimeException('Only draft tax invoices can be deleted.');
        DB::transaction(fn() => $ti->delete());
    }

    /**
     * Auto-create a draft Tax Invoice from an Export Invoice.
     * Idempotent — if a non-cancelled TI already exists for this EI, returns it.
     * Snapshots all header + line data. The user must still fill in:
     *  - exchange_rate (defaults to EI's; user updates with the actual customs rate)
     *  - customs_notification_no + customs_notification_date (left blank)
     */
    public function createFromExportInvoice(\Modules\Export\Models\ExportInvoice $ei, ?int $actorId = null): TaxInvoice
    {
        $existing = TaxInvoice::query()
            ->where('export_invoice_id', $ei->id)
            ->where('status', '!=', TaxInvoice::STATUS_CANCELLED)
            ->first();
        if ($existing) return $existing;

        $ei->loadMissing(['items.product', 'partner']);

        // Pull supplier GSTIN from the active company; recipient GSTIN from the partner.
        $companyGst = optional(\Modules\Companies\Models\Company::find($ei->company_id))->gst_no;
        $partnerGst = optional($ei->partner)->gst_no;

        // Family-sequence: derive TI code from EI's number using TI's own prefix/format.
        $familyCode = null;
        $familyNumber = SequenceService::extractFamilyNumber((string) $ei->code);
        if ($familyNumber !== null) {
            $familyCode = $this->sequences->formatWithNumber((int) $ei->company_id, 'tax_invoice', $familyNumber);
        }

        $header = [
            'code'                      => $familyCode,
            'export_invoice_id'         => $ei->id,
            'partner_id'                => $ei->partner_id,
            'invoice_date'              => now()->toDateString(),
            'date_of_supply'            => $ei->date_of_supply?->toDateString() ?? $ei->invoice_date?->toDateString(),
            'currency'                  => $ei->currency,
            'exchange_rate'             => $ei->exchange_rate ?: 1,
            'transport_mode'            => $ei->transport_mode,
            'incoterm'                  => $ei->incoterm,
            'lut_no'                    => $ei->lut_no,
            'lut_date'                  => $ei->lut_date?->toDateString(),
            'tax_details'               => $ei->tax_details,
            'gstin_supplier'            => $companyGst,
            'gstin_recipient'           => $partnerGst,
            'consignee_partner_id'      => $ei->consignee_partner_id,
            'consignee_name'            => $ei->consignee_name,
            'consignee_address'         => $ei->consignee_address,
            'consignee_country'         => $ei->consignee_country,
            'consignee_contact_person'  => $ei->consignee_contact_person,
            'consignee_phone'           => $ei->consignee_phone,
            'consignee_email'           => $ei->consignee_email,
            'consignee_registration_no' => $ei->consignee_registration_no,
            'notify_party_name'         => $ei->notify_party_name,
            'notify_party_address'      => $ei->notify_party_address,
            'port_of_loading'           => $ei->port_of_loading,
            'port_of_discharge'         => $ei->port_of_discharge,
            'loading_destination'       => $ei->loading_destination,
            'final_destination'         => $ei->final_destination,
            'payment_terms'             => $ei->payment_terms,
            'tax_type'                  => $ei->tax_type ?: 'igst',
            'discount'                  => (float) $ei->discount,
            'shipping'                  => (float) $ei->shipping,
            'freight_charge'            => (float) $ei->freight_charge,
            'packaging_charge'          => (float) $ei->packaging_charge,
            'development_charge'        => (float) $ei->development_charge,
        ];

        $lines = $ei->items->map(fn($l) => [
            'export_invoice_item_id' => $l->id,
            'product_id'             => $l->product_id,
            'hsn_code'               => $l->hsn_code,
            'qty'                    => (float) $l->qty,
            'shipper_qty'            => $l->shipper_qty != null ? (float) $l->shipper_qty : null,
            'shipper_unit'           => $l->shipper_unit,
            'rate'                   => (float) $l->rate,
            'discount_pct'           => (float) $l->discount_pct,
            'tax_rate'               => (float) $l->tax_rate,
            'batch_no'               => $l->batch_no,
            'expiry_date'            => $l->expiry_date?->toDateString(),
            'notes'                  => $l->notes,
        ])->toArray();

        if (count($lines) === 0) {
            throw new RuntimeException('Cannot generate tax invoice — export invoice has no lines.');
        }

        return $this->create((int) $ei->company_id, $header, $lines, $actorId);
    }

    public function post(TaxInvoice $ti, ?int $actorId = null): TaxInvoice
    {
        if ($ti->status !== TaxInvoice::STATUS_DRAFT) throw new RuntimeException('Only draft tax invoices can be posted.');
        if (! $ti->items()->exists()) throw new RuntimeException('Cannot post a tax invoice with no lines.');
        $this->recalc($ti);
        $ti->forceFill([
            'status' => TaxInvoice::STATUS_POSTED,
            'posted_at' => now(),
            'posted_by' => $actorId,
            'updated_by' => $actorId,
        ])->save();
        return $ti;
    }

    public function cancel(TaxInvoice $ti, ?string $reason = null, ?int $actorId = null): TaxInvoice
    {
        if ($ti->status === TaxInvoice::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        $ti->forceFill([
            'status' => TaxInvoice::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => $actorId,
            'cancellation_reason' => $reason,
            'updated_by' => $actorId,
        ])->save();
        return $ti;
    }

    private function syncLines(TaxInvoice $ti, array $lines): void
    {
        $ti->items()->delete();
        foreach ($lines as $row) {
            $qty  = (float) $row['qty'];
            $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0);
            $tax  = (float) ($row['tax_rate'] ?? 0);
            $sub  = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmt = round($sub * $tax / 100, 2);
            TaxInvoiceItem::create([
                'tax_invoice_id'         => $ti->id,
                'export_invoice_item_id' => $row['export_invoice_item_id'] ?? null,
                'product_id'             => $row['product_id'],
                'hsn_code'               => $row['hsn_code'] ?? null,
                'qty' => $qty,
                'shipper_qty'  => isset($row['shipper_qty']) ? (float) $row['shipper_qty'] : null,
                'shipper_unit' => $row['shipper_unit'] ?? null,
                'rate' => $rate,
                'discount_pct' => $disc, 'tax_rate' => $tax,
                'line_subtotal' => $sub, 'tax_amount' => $taxAmt, 'line_total' => $sub + $taxAmt,
                'batch_no' => $row['batch_no'] ?? null,
                'expiry_date' => $row['expiry_date'] ?? null,
                'notes' => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(TaxInvoice $ti): void
    {
        $items = $ti->items()->get();
        $sub   = (float) $items->sum('line_subtotal');
        $tax   = (float) $items->sum('tax_amount');
        $extra = (float) $ti->shipping
               + (float) $ti->freight_charge
               + (float) $ti->packaging_charge
               + (float) $ti->development_charge;
        $total = $sub + $tax + $extra - (float) $ti->discount;
        $rate  = (float) $ti->exchange_rate;
        $ti->forceFill([
            'subtotal'     => round($sub, 2),
            'tax_amount'   => round($tax, 2),
            'total'        => round($total, 2),
            'subtotal_inr' => round($sub * $rate, 2),
            'total_inr'    => round($total * $rate, 2),
        ])->save();
    }
}
