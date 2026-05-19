<?php

namespace Modules\Sales\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => ['id' => $this->partner?->id, 'code' => $this->partner?->code, 'name' => $this->partner?->name]),
            'sales_order_id' => $this->sales_order_id,
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse', fn() => ['id' => $this->warehouse?->id, 'code' => $this->warehouse?->code, 'name' => $this->warehouse?->name]),
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'reference' => $this->reference,
            'currency' => $this->currency, 'exchange_rate' => (float) $this->exchange_rate,
            'subtotal' => (float) $this->subtotal, 'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'discount' => (float) $this->discount, 'shipping' => (float) $this->shipping,
            'total' => (float) $this->total, 'paid_amount' => (float) $this->paid_amount, 'balance' => (float) $this->balance,
            'status' => $this->status,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'terms_and_conditions' => $this->terms_and_conditions,
            'notes' => $this->notes,
            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'sales_order_item_id' => $l->sales_order_item_id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty, 'rate' => (float) $l->rate,
                'discount_pct' => (float) $l->discount_pct, 'tax_rate' => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal, 'tax_amount' => (float) $l->tax_amount, 'line_total' => (float) $l->line_total,
                'batch_no' => $l->batch_no,
                'expiry_date' => $l->expiry_date?->toDateString(),
                'ledger_id' => $l->ledger_id,
                'notes' => $l->notes,
            ])),
            'payments' => $this->whenLoaded('payments', fn() => $this->payments->map(fn($p) => [
                'id' => $p->id,
                'payment_date' => $p->payment_date?->toDateString(),
                'amount' => (float) $p->amount,
                'mode' => $p->mode,
                'reference' => $p->reference,
                'notes' => $p->notes,
            ])),
            'lines_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
