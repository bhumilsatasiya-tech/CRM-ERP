<?php

namespace Modules\Inventory\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockAdjustmentResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'warehouse_id'        => $this->warehouse_id,
            'warehouse'           => $this->whenLoaded('warehouse', fn() => [
                'id' => $this->warehouse?->id, 'code' => $this->warehouse?->code, 'name' => $this->warehouse?->name,
            ]),
            'code'                => $this->code,
            'adjustment_date'     => $this->adjustment_date?->toDateString(),
            'reason'              => $this->reason,
            'status'              => $this->status,
            'notes'               => $this->notes,
            'submitted_by'        => $this->submitted_by,
            'submitted_at'        => $this->submitted_at?->toIso8601String(),
            'approved_by'         => $this->approved_by,
            'approved_at'         => $this->approved_at?->toIso8601String(),
            'cancelled_by'        => $this->cancelled_by,
            'cancelled_at'        => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'lines'               => StockAdjustmentLineResource::collection($this->whenLoaded('lines')),
            'lines_count'         => $this->whenCounted('lines'),
            'created_at'          => $this->created_at?->toIso8601String(),
            'updated_at'          => $this->updated_at?->toIso8601String(),
        ];
    }
}
