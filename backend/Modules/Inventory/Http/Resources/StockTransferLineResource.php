<?php

namespace Modules\Inventory\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockTransferLineResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'            => $this->id,
            'product_id'    => $this->product_id,
            'product'       => $this->whenLoaded('product', fn() => [
                'id' => $this->product?->id, 'code' => $this->product?->code, 'name' => $this->product?->name,
            ]),
            'qty'           => (float) $this->qty,
            'rate'          => (float) $this->rate,
            'value'         => (float) $this->value,
            'batch_no'      => $this->batch_no,
            'expiry_date'   => $this->expiry_date?->toDateString(),
            'serial_no'     => $this->serial_no,
            'out_ledger_id' => $this->out_ledger_id,
            'in_ledger_id'  => $this->in_ledger_id,
            'notes'         => $this->notes,
        ];
    }
}
