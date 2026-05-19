<?php

namespace Modules\Crm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PartnerContactResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'          => $this->id,
            'partner_id'  => $this->partner_id,
            'name'        => $this->name,
            'designation' => $this->designation,
            'department'  => $this->department,
            'email'       => $this->email,
            'phone'       => $this->phone,
            'mobile'      => $this->mobile,
            'is_primary'  => (bool) $this->is_primary,
            'is_active'   => (bool) $this->is_active,
            'notes'       => $this->notes,
            'created_at'  => $this->created_at?->toIso8601String(),
            'updated_at'  => $this->updated_at?->toIso8601String(),
        ];
    }
}
