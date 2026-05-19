<?php

namespace Modules\Companies\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'         => $this->id,
            'company_id' => $this->company_id,
            'branch_id'  => $this->branch_id,
            'code'       => $this->code,
            'name'       => $this->name,
            'type'       => $this->type,
            'address'    => [
                'line1'       => $this->address_line1,
                'city'        => $this->city,
                'state'       => $this->state,
                'country'     => $this->country,
                'postal_code' => $this->postal_code,
            ],
            'is_active'  => (bool) $this->is_active,
            'is_default' => (bool) $this->is_default,
            'branch'     => $this->whenLoaded('branch', fn() => [
                'id'   => $this->branch?->id,
                'code' => $this->branch?->code,
                'name' => $this->branch?->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
