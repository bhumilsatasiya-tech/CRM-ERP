<?php

namespace Modules\Products\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'code'        => $this->code,
            'barcode'     => $this->barcode,
            'name'        => $this->name,
            'description' => $this->description,

            'category_id' => $this->category_id,
            'category'    => $this->whenLoaded('category', fn() => [
                'id' => $this->category?->id, 'code' => $this->category?->code, 'name' => $this->category?->name,
            ]),

            'type'            => $this->type,
            'is_company_made' => (bool) $this->is_company_made,

            'unit_id' => $this->unit_id,
            'unit'    => $this->whenLoaded('unit', fn() => [
                'id' => $this->unit?->id, 'code' => $this->unit?->code, 'symbol' => $this->unit?->symbol,
            ]),

            'hsn_code'             => $this->hsn_code,
            'tax_rate'             => (float) $this->tax_rate,

            'standard_cost'        => (float) $this->standard_cost,
            'last_purchase_cost'   => (float) $this->last_purchase_cost,
            'opening_stock_qty'    => (float) $this->opening_stock_qty,
            'opening_stock_value'  => (float) $this->opening_stock_value,

            'standard_price'       => (float) $this->standard_price,
            'mrp'                  => (float) $this->mrp,
            'currency'             => $this->currency,

            'reorder_level'        => (float) $this->reorder_level,
            'reorder_qty'          => (float) $this->reorder_qty,
            'min_stock'            => (float) $this->min_stock,
            'max_stock'            => (float) $this->max_stock,
            'lead_time_days'       => (int) $this->lead_time_days,
            'shelf_life_days'      => $this->shelf_life_days ? (int) $this->shelf_life_days : null,

            'has_batches' => (bool) $this->has_batches,
            'has_expiry'  => (bool) $this->has_expiry,
            'has_serials' => (bool) $this->has_serials,

            'default_warehouse_id' => $this->default_warehouse_id,

            'is_active'      => (bool) $this->is_active,
            'is_purchasable' => (bool) $this->is_purchasable,
            'is_sellable'    => (bool) $this->is_sellable,
            'is_stockable'   => (bool) $this->is_stockable,

            'weight'         => $this->weight === null ? null : (float) $this->weight,
            'weight_unit_id' => $this->weight_unit_id,
            'length'         => $this->length === null ? null : (float) $this->length,
            'width'          => $this->width === null ? null : (float) $this->width,
            'height'         => $this->height === null ? null : (float) $this->height,

            'image_path' => $this->image_path,
            'meta'       => $this->meta,
            'notes'      => $this->notes,

            'uom_conversions' => ProductUomConversionResource::collection($this->whenLoaded('uomConversions')),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
