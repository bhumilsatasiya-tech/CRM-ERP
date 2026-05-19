<?php

namespace Modules\Production\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductionBatchInputResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'              => $this->id,
            'batch_id'        => $this->batch_id,
            'product_id'      => $this->product_id,
            'product'         => $this->whenLoaded('product', fn() => [
                'id' => $this->product?->id, 'code' => $this->product?->code, 'name' => $this->product?->name,
            ]),
            'qty_planned'     => (float) $this->qty_planned,
            'qty_consumed'    => (float) $this->qty_consumed,
            'rate'            => (float) $this->rate,
            'line_value'      => (float) $this->line_value,
            'source_batch_no' => $this->source_batch_no,
            'ledger_id'       => $this->ledger_id,
            'notes'           => $this->notes,
        ];
    }
}
