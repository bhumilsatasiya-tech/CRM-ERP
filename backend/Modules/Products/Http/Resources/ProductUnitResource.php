<?php

namespace Modules\Products\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductUnitResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'code'              => $this->code,
            'name'              => $this->name,
            'formal_name'       => $this->formal_name,
            'symbol'            => $this->symbol,
            'uqc'               => $this->uqc,
            'type'              => $this->type,
            'base_unit_id'      => $this->base_unit_id,
            'conversion_factor' => (float) $this->conversion_factor,
            'is_base'           => (bool) $this->is_base,
            'decimals_allowed'  => (int) $this->decimals_allowed,
            'is_active'         => (bool) $this->is_active,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
