<?php

namespace Modules\Export\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ShippingBillResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'export_invoice_id' => $this->export_invoice_id,
            'export_invoice' => $this->whenLoaded('exportInvoice', fn() => $this->exportInvoice ? [
                'id' => $this->exportInvoice->id, 'code' => $this->exportInvoice->code,
            ] : null),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse', fn() => $this->warehouse ? [
                'id' => $this->warehouse->id, 'code' => $this->warehouse->code, 'name' => $this->warehouse->name,
            ] : null),

            'bl_no' => $this->bl_no,
            'bl_date' => $this->bl_date?->toDateString(),
            'vessel_name' => $this->vessel_name,
            'voyage_no' => $this->voyage_no,
            'carrier' => $this->carrier,
            'container_no' => $this->container_no,
            'port_of_loading' => $this->port_of_loading,
            'port_of_discharge' => $this->port_of_discharge,
            'etd' => $this->etd?->toDateString(),
            'eta' => $this->eta?->toDateString(),

            'status' => $this->status,
            'dispatched_at' => $this->dispatched_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,

            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'export_invoice_item_id' => $l->export_invoice_item_id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty,
                'batch_no' => $l->batch_no,
                'expiry_date' => $l->expiry_date?->toDateString(),
                'ledger_id' => $l->ledger_id,
                'notes' => $l->notes,
            ])),

            'lines_count' => $this->whenCounted('items'),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
