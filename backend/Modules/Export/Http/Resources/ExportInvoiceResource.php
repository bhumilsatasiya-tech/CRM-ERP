<?php

namespace Modules\Export\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExportInvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),
            'sales_order_id' => $this->sales_order_id,

            'invoice_date'   => $this->invoice_date?->toDateString(),
            'date_of_supply' => $this->date_of_supply?->toDateString(),
            'due_date'       => $this->due_date?->toDateString(),
            'reference'      => $this->reference,

            'currency' => $this->currency,
            'exchange_rate' => (float) $this->exchange_rate,

            'incoterm'       => $this->incoterm,
            'transport_mode' => $this->transport_mode,
            'lut_no'         => $this->lut_no,
            'lut_date'       => $this->lut_date?->toDateString(),
            'tax_details'    => $this->tax_details,

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

            'port_of_loading'        => $this->port_of_loading,
            'port_of_discharge'      => $this->port_of_discharge,
            'loading_destination'    => $this->loading_destination,
            'final_destination'      => $this->final_destination,
            'country_of_destination' => $this->country_of_destination,
            'payment_terms'          => $this->payment_terms,

            'subtotal' => (float) $this->subtotal, 'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'discount' => (float) $this->discount, 'shipping' => (float) $this->shipping,
            'freight_charge'     => (float) $this->freight_charge,
            'packaging_charge'   => (float) $this->packaging_charge,
            'development_charge' => (float) $this->development_charge,
            'total' => (float) $this->total,
            'paid_amount' => (float) $this->paid_amount,
            'balance' => (float) $this->balance,

            'status' => $this->status,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,

            'terms_and_conditions' => $this->terms_and_conditions,
            'notes' => $this->notes,

            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'sales_order_item_id' => $l->sales_order_item_id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty,
                'shipper_qty'  => $l->shipper_qty !== null ? (float) $l->shipper_qty : null,
                'shipper_unit' => $l->shipper_unit,
                'rate' => (float) $l->rate,
                'discount_pct' => (float) $l->discount_pct, 'tax_rate' => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal, 'tax_amount' => (float) $l->tax_amount, 'line_total' => (float) $l->line_total,
                'shipped_qty' => (float) $l->shipped_qty,
                'batch_no' => $l->batch_no,
                'expiry_date' => $l->expiry_date?->toDateString(),
                'notes' => $l->notes,
            ])),

            'shipping_bills' => $this->whenLoaded('shippingBills', fn() => $this->shippingBills->map(fn($sb) => [
                'id' => $sb->id, 'code' => $sb->code, 'status' => $sb->status,
                'bl_no' => $sb->bl_no, 'bl_date' => $sb->bl_date?->toDateString(),
                'dispatched_at' => $sb->dispatched_at?->toIso8601String(),
            ])->values()),

            'packing_lists' => $this->whenLoaded('packingLists', fn() => $this->packingLists->map(fn($pl) => [
                'id' => $pl->id, 'code' => $pl->code, 'status' => $pl->status,
                'pl_date' => $pl->pl_date?->toDateString(),
            ])->values()),

            'tax_invoices' => $this->whenLoaded('taxInvoices', fn() => $this->taxInvoices->map(fn($t) => [
                'id' => $t->id, 'code' => $t->code, 'status' => $t->status,
                'invoice_date' => $t->invoice_date?->toDateString(),
                'total_inr' => (float) $t->total_inr,
            ])->values()),

            'lines_count' => $this->whenCounted('items'),
            'shipping_bills_count' => $this->whenCounted('shippingBills'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
