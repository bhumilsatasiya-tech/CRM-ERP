<?php

namespace Modules\Quotation\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => ['id' => $this->partner?->id, 'code' => $this->partner?->code, 'name' => $this->partner?->name]),
            'quotation_date' => $this->quotation_date?->toDateString(),
            'valid_until' => $this->valid_until?->toDateString(),
            'reference' => $this->reference,
            'currency' => $this->currency, 'exchange_rate' => (float) $this->exchange_rate,
            'subtotal' => (float) $this->subtotal, 'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'discount' => (float) $this->discount, 'shipping' => (float) $this->shipping, 'total' => (float) $this->total,
            'status' => $this->status,
            'converted_to_sales_order_id' => $this->converted_to_sales_order_id,
            'terms_and_conditions' => $this->terms_and_conditions,
            'notes' => $this->notes,
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
