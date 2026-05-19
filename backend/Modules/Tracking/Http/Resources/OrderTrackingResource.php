<?php

namespace Modules\Tracking\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape for the tracking dashboard list (one row per Sales Order, with computed progress).
 * The full timeline payload from OrderTrackingService::traceSalesOrder is returned as-is
 * (already a structured array) and does not flow through this resource.
 */
class OrderTrackingResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        $progress = $this->_progress ?? [];

        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => $this->status,
            'order_date' => $this->order_date?->toDateString(),
            'expected_delivery_date' => $this->expected_delivery_date?->toDateString(),
            'partner' => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),
            'currency' => $this->currency,
            'total' => (float) $this->total,
            'invoiced_amount' => (float) $this->invoiced_amount,
            'lines_count' => $this->whenLoaded('items', fn() => $this->items->count()),
            'invoices_count' => $this->whenLoaded('invoices', fn() => $this->invoices->count()),
            'batches_count' => $this->whenLoaded('productionBatches', fn() => $this->productionBatches->count()),
            'progress' => [
                'ordered_qty'     => (float) ($progress['ordered_qty']    ?? 0),
                'produced_qty'    => (float) ($progress['produced_qty']   ?? 0),
                'invoiced_amount' => (float) ($progress['invoiced_amount']?? 0),
                'paid_amount'     => (float) ($progress['paid_amount']    ?? 0),
                'produced_pct'    => (float) ($progress['produced_pct']   ?? 0),
                'invoiced_pct'    => (float) ($progress['invoiced_pct']   ?? 0),
                'paid_pct'        => (float) ($progress['paid_pct']       ?? 0),
            ],
        ];
    }
}
