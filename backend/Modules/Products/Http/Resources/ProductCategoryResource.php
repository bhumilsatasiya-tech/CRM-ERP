<?php

namespace Modules\Products\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductCategoryResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'parent_id'   => $this->parent_id,
            'code'        => $this->code,
            'name'        => $this->name,
            'description' => $this->description,
            'depth'       => (int) $this->depth,
            'path'        => $this->path,
            'sort_order'  => (int) $this->sort_order,
            'is_active'   => (bool) $this->is_active,
            'created_at'  => $this->created_at?->toIso8601String(),
            'updated_at'  => $this->updated_at?->toIso8601String(),
        ];
    }
}
