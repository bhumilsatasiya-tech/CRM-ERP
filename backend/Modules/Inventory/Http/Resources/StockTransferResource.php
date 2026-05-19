<?php

namespace Modules\Inventory\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockTransferResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                    => $this->id,
            'company_id'            => $this->company_id,
            'code'                  => $this->code,
            'from_warehouse_id'     => $this->from_warehouse_id,
            'from_warehouse'        => $this->whenLoaded('fromWarehouse', fn() => [
                'id' => $this->fromWarehouse?->id, 'code' => $this->fromWarehouse?->code, 'name' => $this->fromWarehouse?->name,
            ]),
            'to_warehouse_id'       => $this->to_warehouse_id,
            'to_warehouse'          => $this->whenLoaded('toWarehouse', fn() => [
                'id' => $this->toWarehouse?->id, 'code' => $this->toWarehouse?->code, 'name' => $this->toWarehouse?->name,
            ]),
            'transfer_date'         => $this->transfer_date?->toDateString(),
            'expected_arrival_date' => $this->expected_arrival_date?->toDateString(),
            'actual_arrival_date'   => $this->actual_arrival_date?->toDateString(),
            'status'                => $this->status,
            'notes'                 => $this->notes,
            'sent_by'               => $this->sent_by,
            'sent_at'               => $this->sent_at?->toIso8601String(),
            'received_by'           => $this->received_by,
            'received_at'           => $this->received_at?->toIso8601String(),
            'cancelled_by'          => $this->cancelled_by,
            'cancelled_at'          => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason'   => $this->cancellation_reason,
            'lines'                 => StockTransferLineResource::collection($this->whenLoaded('lines')),
            'lines_count'           => $this->whenCounted('lines'),
            'created_at'            => $this->created_at?->toIso8601String(),
            'updated_at'            => $this->updated_at?->toIso8601String(),
        ];
    }
}
