<?php

namespace Modules\InterCompany\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InterCompanyInvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'code' => $this->code,

            'from_company_id' => $this->from_company_id,
            'from_company'    => $this->whenLoaded('fromCompany', fn() => $this->fromCompany ? [
                'id' => $this->fromCompany->id, 'code' => $this->fromCompany->code, 'name' => $this->fromCompany->name,
            ] : null),
            'to_company_id'   => $this->to_company_id,
            'to_company'      => $this->whenLoaded('toCompany', fn() => $this->toCompany ? [
                'id' => $this->toCompany->id, 'code' => $this->toCompany->code, 'name' => $this->toCompany->name,
            ] : null),

            'from_warehouse_id' => $this->from_warehouse_id,
            'from_warehouse'    => $this->whenLoaded('fromWarehouse', fn() => $this->fromWarehouse ? [
                'id' => $this->fromWarehouse->id, 'code' => $this->fromWarehouse->code, 'name' => $this->fromWarehouse->name,
            ] : null),
            'to_warehouse_id'   => $this->to_warehouse_id,
            'to_warehouse'      => $this->whenLoaded('toWarehouse', fn() => $this->toWarehouse ? [
                'id' => $this->toWarehouse->id, 'code' => $this->toWarehouse->code, 'name' => $this->toWarehouse->name,
            ] : null),

            'invoice_date'  => $this->invoice_date?->toDateString(),
            'due_date'      => $this->due_date?->toDateString(),
            'currency'      => $this->currency,
            'exchange_rate' => (float) $this->exchange_rate,

            'cost_basis' => (float) $this->cost_basis,
            'profit_pct' => (float) $this->profit_pct,
            'subtotal'   => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'total'      => (float) $this->total,

            'status'                 => $this->status,
            'posted_at'              => $this->posted_at?->toIso8601String(),
            'cancelled_at'           => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason'    => $this->cancellation_reason,

            'linked_sale_invoice_id'      => $this->linked_sale_invoice_id,
            'linked_sale_invoice'         => $this->whenLoaded('linkedSaleInvoice', fn() => $this->linkedSaleInvoice ? [
                'id' => $this->linkedSaleInvoice->id, 'code' => $this->linkedSaleInvoice->code, 'status' => $this->linkedSaleInvoice->status,
            ] : null),
            'linked_purchase_invoice_id'  => $this->linked_purchase_invoice_id,
            'linked_purchase_invoice'     => $this->whenLoaded('linkedPurchaseInvoice', fn() => $this->linkedPurchaseInvoice ? [
                'id' => $this->linkedPurchaseInvoice->id, 'code' => $this->linkedPurchaseInvoice->code, 'status' => $this->linkedPurchaseInvoice->status,
            ] : null),

            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty,
                'cost_rate' => (float) $l->cost_rate,
                'sell_rate' => (float) $l->sell_rate,
                'tax_rate'  => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal,
                'tax_amount'    => (float) $l->tax_amount,
                'line_total'    => (float) $l->line_total,
                'batch_no'      => $l->batch_no,
                'expiry_date'   => $l->expiry_date?->toDateString(),
                'from_ledger_id'=> $l->from_ledger_id,
                'to_ledger_id'  => $l->to_ledger_id,
                'notes'         => $l->notes,
            ])->values()),

            'lines_count' => $this->whenCounted('items'),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
