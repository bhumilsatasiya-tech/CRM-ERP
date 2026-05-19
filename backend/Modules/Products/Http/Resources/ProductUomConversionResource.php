<?php

namespace Modules\Products\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductUomConversionResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                  => $this->id,
            'product_id'          => $this->product_id,
            'unit_id'             => $this->unit_id,
            'unit'                => $this->whenLoaded('unit', fn() => [
                'id' => $this->unit?->id, 'code' => $this->unit?->code, 'symbol' => $this->unit?->symbol,
            ]),
            'conversion_factor'   => (float) $this->conversion_factor,
            'is_purchase_default' => (bool) $this->is_purchase_default,
            'is_sales_default'    => (bool) $this->is_sales_default,
            'notes'               => $this->notes,
            'is_active'           => (bool) $this->is_active,
            'created_at'          => $this->created_at?->toIso8601String(),
            'updated_at'          => $this->updated_at?->toIso8601String(),
        ];
    }
}
