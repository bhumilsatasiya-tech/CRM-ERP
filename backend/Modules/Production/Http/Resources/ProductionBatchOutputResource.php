<?php

namespace Modules\Production\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductionBatchOutputResource extends JsonResource
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
            'output_type'     => $this->output_type,
            'qty_planned'     => (float) $this->qty_planned,
            'qty_produced'    => (float) $this->qty_produced,
            'rate'            => (float) $this->rate,
            'line_value'      => (float) $this->line_value,
            'output_batch_no' => $this->output_batch_no,
            'expiry_date'     => $this->expiry_date?->toDateString(),
            'ledger_id'       => $this->ledger_id,
            'notes'           => $this->notes,
        ];
    }
}
