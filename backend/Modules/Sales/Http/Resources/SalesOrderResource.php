<?php

namespace Modules\Sales\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => ['id' => $this->partner?->id, 'code' => $this->partner?->code, 'name' => $this->partner?->name]),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse', fn() => ['id' => $this->warehouse?->id, 'code' => $this->warehouse?->code, 'name' => $this->warehouse?->name]),
            'quotation_id' => $this->quotation_id,
            'order_date' => $this->order_date?->toDateString(),
            'expected_delivery_date' => $this->expected_delivery_date?->toDateString(),
            'reference' => $this->reference,
            'currency' => $this->currency, 'exchange_rate' => (float) $this->exchange_rate,
            'subtotal' => (float) $this->subtotal, 'tax_amount' => (float) $this->tax_amount,
            'tax_type' => $this->tax_type,
            'cgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'sgst_amount' => (float) ($this->tax_type === 'cgst_sgst' ? round((float) $this->tax_amount / 2, 2) : 0),
            'igst_amount' => (float) ($this->tax_type === 'igst' ? (float) $this->tax_amount : 0),
            'discount' => (float) $this->discount, 'shipping' => (float) $this->shipping, 'total' => (float) $this->total,
            'invoiced_amount' => (float) $this->invoiced_amount,
            'status' => $this->status,
            'terms_and_conditions' => $this->terms_and_conditions,
            'notes' => $this->notes,
            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id, 'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty, 'rate' => (float) $l->rate,
                'discount_pct' => (float) $l->discount_pct, 'tax_rate' => (float) $l->tax_rate,
                'line_subtotal' => (float) $l->line_subtotal, 'tax_amount' => (float) $l->tax_amount, 'line_total' => (float) $l->line_total,
                'invoiced_qty' => (float) $l->invoiced_qty,
                'notes' => $l->notes,
            ])),
            'lines_count' => $this->whenCounted('items'),

            // Cross-module summaries (only present when eager-loaded by the controller)
            'quotation' => $this->whenLoaded('quotation', fn() => $this->quotation ? [
                'id' => $this->quotation->id, 'code' => $this->quotation->code, 'status' => $this->quotation->status,
            ] : null),
            'production_batches' => $this->whenLoaded('productionBatches', fn() => $this->productionBatches->map(fn($b) => [
                'id' => $b->id, 'code' => $b->code, 'status' => $b->status,
                'qty_planned'  => (float) $b->qty_planned,
                'qty_produced' => (float) $b->qty_produced,
                'qty_failed'   => (float) $b->qty_failed,
                'completed_at' => $b->completed_at?->toIso8601String(),
            ])->values()),
            'invoices' => $this->whenLoaded('invoices', fn() => $this->invoices->map(fn($inv) => [
                'id' => $inv->id, 'code' => $inv->code, 'status' => $inv->status,
                'invoice_date' => $inv->invoice_date?->toDateString(),
                'total' => (float) $inv->total,
                'paid_amount' => (float) $inv->paid_amount,
                'balance' => (float) $inv->balance,
            ])->values()),
            'export_invoices' => $this->whenLoaded('exportInvoices', fn() => $this->exportInvoices->map(fn($ei) => [
                'id' => $ei->id, 'code' => $ei->code, 'status' => $ei->status,
                'invoice_date' => $ei->invoice_date?->toDateString(),
                'currency' => $ei->currency,
                'total' => (float) $ei->total,
                'paid_amount' => (float) $ei->paid_amount,
                'balance' => (float) $ei->balance,
            ])->values()),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
