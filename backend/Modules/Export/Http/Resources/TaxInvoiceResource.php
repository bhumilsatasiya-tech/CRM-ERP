<?php

namespace Modules\Export\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TaxInvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        $taxAmt = (float) $this->tax_amount;
        $type   = $this->tax_type;
        $cgst = $type === 'cgst_sgst' ? round($taxAmt / 2, 2) : 0;
        $sgst = $cgst;
        $igst = $type === 'igst' ? $taxAmt : 0;

        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'export_invoice_id' => $this->export_invoice_id,
            'export_invoice' => $this->whenLoaded('exportInvoice', fn() => $this->exportInvoice ? [
                'id' => $this->exportInvoice->id, 'code' => $this->exportInvoice->code, 'currency' => $this->exportInvoice->currency,
            ] : null),
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),

            'invoice_date'   => $this->invoice_date?->toDateString(),
            'date_of_supply' => $this->date_of_supply?->toDateString(),
            'reference'      => $this->reference,

            'currency'      => $this->currency,
            'exchange_rate' => (float) $this->exchange_rate,

            'transport_mode' => $this->transport_mode,
            'incoterm'       => $this->incoterm,
            'lut_no'         => $this->lut_no,
            'lut_date'       => $this->lut_date?->toDateString(),
            'tax_details'    => $this->tax_details,

            'customs_notification_no'   => $this->customs_notification_no,
            'customs_notification_date' => $this->customs_notification_date?->toDateString(),

            'gstin_supplier'  => $this->gstin_supplier,
            'gstin_recipient' => $this->gstin_recipient,
            'place_of_supply' => $this->place_of_supply,

            'consignee_partner_id'      => $this->consignee_partner_id,
            'consignee' => $this->whenLoaded('consignee', fn() => $this->consignee ? [
                'id' => $this->consignee->id, 'code' => $this->consignee->code, 'name' => $this->consignee->name,
            ] : null),
            'consignee_name'            => $this->consignee_name,
            'consignee_address'         => $this->consignee_address,
            'consignee_country'         => $this->consignee_country,
            'consignee_contact_person'  => $this->consignee_contact_person,
            'consignee_phone'           => $this->consignee_phone,
            'consignee_email'           => $this->consignee_email,
            'consignee_registration_no' => $this->consignee_registration_no,

            'notify_party_name'    => $this->notify_party_name,
            'notify_party_address' => $this->notify_party_address,

            'port_of_loading'     => $this->port_of_loading,
            'port_of_discharge'   => $this->port_of_discharge,
            'loading_destination' => $this->loading_destination,
            'final_destination'   => $this->final_destination,
            'payment_terms'       => $this->payment_terms,

            'subtotal'   => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'tax_type'   => $type,
            'cgst_amount'=> (float) $cgst,
            'sgst_amount'=> (float) $sgst,
            'igst_amount'=> (float) $igst,
            'discount'   => (float) $this->discount,
            'shipping'   => (float) $this->shipping,
            'freight_charge'     => (float) $this->freight_charge,
            'packaging_charge'   => (float) $this->packaging_charge,
            'development_charge' => (float) $this->development_charge,
            'total'      => (float) $this->total,

            'subtotal_inr' => (float) $this->subtotal_inr,
            'total_inr'    => (float) $this->total_inr,

            'status' => $this->status,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,

            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'export_invoice_item_id' => $l->export_invoice_item_id,
                'product_id' => $l->product_id,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'hsn_code' => $l->hsn_code,
                'qty' => (float) $l->qty,
                'shipper_qty' => $l->shipper_qty !== null ? (float) $l->shipper_qty : null,
                'shipper_unit' => $l->shipper_unit,
                'rate' => (float) $l->rate,
                'discount_pct' => (float) $l->discount_pct, 'tax_rate' => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal, 'tax_amount' => (float) $l->tax_amount, 'line_total' => (float) $l->line_total,
                'batch_no' => $l->batch_no,
                'expiry_date' => $l->expiry_date?->toDateString(),
                'notes' => $l->notes,
            ])->values()),
            'lines_count' => $this->whenCounted('items'),

            'terms_and_conditions' => $this->terms_and_conditions,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
