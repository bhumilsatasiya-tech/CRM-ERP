<?php

namespace Modules\Inventory\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockLedgerResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'warehouse_id'    => $this->warehouse_id,
            'warehouse'       => $this->whenLoaded('warehouse', fn() => [
                'id' => $this->warehouse?->id, 'code' => $this->warehouse?->code, 'name' => $this->warehouse?->name,
            ]),
            'product_id'      => $this->product_id,
            'product'         => $this->whenLoaded('product', fn() => [
                'id'   => $this->product?->id,
                'code' => $this->product?->code,
                'name' => $this->product?->name,
                'unit' => $this->product?->unit?->symbol,
            ]),
            'movement_type'   => $this->movement_type,
            'reference_type'  => $this->reference_type,
            'reference_id'    => $this->reference_id,
            'reference_no'    => $this->reference_no,
            'batch_no'        => $this->batch_no,
            'expiry_date'     => $this->expiry_date?->toDateString(),
            'serial_no'       => $this->serial_no,
            'qty'             => (float) $this->qty,
            'balance_qty'     => (float) $this->balance_qty,
            'rate'            => (float) $this->rate,
            'value'           => (float) $this->value,
            'posted_at'       => $this->posted_at?->toIso8601String(),
            'is_reversal'     => (bool) $this->is_reversal,
            'is_reversed'     => (bool) $this->is_reversed,
            'reverses_ledger_id'    => $this->reverses_ledger_id,
            'reversed_by_ledger_id' => $this->reversed_by_ledger_id,
            'notes'           => $this->notes,
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
