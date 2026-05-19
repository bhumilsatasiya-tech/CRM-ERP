<?php

namespace Modules\Companies\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BranchResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'code'           => $this->code,
            'name'           => $this->name,
            'is_head_office' => (bool) $this->is_head_office,
            'email'          => $this->email,
            'phone'          => $this->phone,
            'address'        => [
                'line1'       => $this->address_line1,
                'line2'       => $this->address_line2,
                'city'        => $this->city,
                'state'       => $this->state,
                'country'     => $this->country,
                'postal_code' => $this->postal_code,
            ],
            'gst_no'           => $this->gst_no,
            'is_active'        => (bool) $this->is_active,
            'warehouses_count' => $this->whenCounted('warehouses'),
            'created_at'       => $this->created_at?->toIso8601String(),
            'updated_at'       => $this->updated_at?->toIso8601String(),
        ];
    }
}
