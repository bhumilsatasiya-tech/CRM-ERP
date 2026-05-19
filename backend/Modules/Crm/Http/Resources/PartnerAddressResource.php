<?php

namespace Modules\Crm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PartnerAddressResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                => $this->id,
            'partner_id'        => $this->partner_id,
            'type'              => $this->type,
            'label'             => $this->label,
            'contact_name'      => $this->contact_name,
            'phone'             => $this->phone,
            'email'             => $this->email,
            'line1'             => $this->line1,
            'line2'             => $this->line2,
            'landmark'          => $this->landmark,
            'city'              => $this->city,
            'state'             => $this->state,
            'country'           => $this->country,
            'postal_code'       => $this->postal_code,
            'gst_no_at_address' => $this->gst_no_at_address,
            'is_primary'        => (bool) $this->is_primary,
            'is_active'         => (bool) $this->is_active,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
