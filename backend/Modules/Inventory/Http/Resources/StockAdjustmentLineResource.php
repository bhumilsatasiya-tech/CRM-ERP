<?php

namespace Modules\Inventory\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockAdjustmentLineResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'           => $this->id,
            'product_id'   => $this->product_id,
            'product'      => $this->whenLoaded('product', fn() => [
                'id' => $this->product?->id, 'code' => $this->product?->code, 'name' => $this->product?->name,
            ]),
            'current_qty'  => (float) $this->current_qty,
            'counted_qty'  => (float) $this->counted_qty,
            'difference'   => (float) $this->difference,
            'rate'         => (float) $this->rate,
            'value'        => (float) $this->value,
            'batch_no'     => $this->batch_no,
            'expiry_date'  => $this->expiry_date?->toDateString(),
            'serial_no'    => $this->serial_no,
            'ledger_id'    => $this->ledger_id,
            'notes'        => $this->notes,
        ];
    }
}
