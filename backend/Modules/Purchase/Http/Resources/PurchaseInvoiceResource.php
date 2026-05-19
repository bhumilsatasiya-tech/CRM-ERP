<?php

namespace Modules\Purchase\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseInvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => ['id' => $this->partner?->id, 'code' => $this->partner?->code, 'name' => $this->partner?->name]),
            'purchase_order_id' => $this->purchase_order_id,
            'grn_id' => $this->grn_id,
            'supplier_invoice_no' => $this->supplier_invoice_no,
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'currency' => $this->currency, 'exchange_rate' => (float) $this->exchange_rate,
            'subtotal' => (float) $this->subtotal, 'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'discount' => (float) $this->discount, 'shipping' => (float) $this->shipping,
            'total' => (float) $this->total, 'paid_amount' => (float) $this->paid_amount, 'balance' => (float) $this->balance,
            'status' => $this->status, 'notes' => $this->notes,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id, 'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty, 'rate' => (float) $l->rate,
                'discount_pct' => (float) $l->discount_pct, 'tax_rate' => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal, 'tax_amount' => (float) $l->tax_amount, 'line_total' => (float) $l->line_total,
                'notes' => $l->notes,
            ])),
            'lines_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
