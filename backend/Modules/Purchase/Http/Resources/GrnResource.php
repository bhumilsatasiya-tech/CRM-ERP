<?php

namespace Modules\Purchase\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class GrnResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'purchase_order_id' => $this->purchase_order_id,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => ['id' => $this->partner?->id, 'code' => $this->partner?->code, 'name' => $this->partner?->name]),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse', fn() => ['id' => $this->warehouse?->id, 'code' => $this->warehouse?->code, 'name' => $this->warehouse?->name]),
            'grn_date' => $this->grn_date?->toDateString(),
            'supplier_invoice_no' => $this->supplier_invoice_no,
            'supplier_invoice_date' => $this->supplier_invoice_date?->toDateString(),
            'vehicle_no' => $this->vehicle_no, 'lr_no' => $this->lr_no,
            'status' => $this->status, 'notes' => $this->notes,
            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'purchase_order_item_id' => $l->purchase_order_item_id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty, 'rate' => (float) $l->rate, 'line_total' => (float) $l->line_total,
                'batch_no' => $l->batch_no,
                'expiry_date' => $l->expiry_date?->toDateString(),
                'manufacturing_date' => $l->manufacturing_date?->toDateString(),
                'serial_no' => $l->serial_no,
                'ledger_id' => $l->ledger_id, 'notes' => $l->notes,
            ])),
            'lines_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
