<?php

namespace Modules\Companies\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'              => $this->id,
            'code'            => $this->code,
            'name'            => $this->name,
            'legal_name'      => $this->legal_name,
            'type'            => $this->type,
            'gst_no'          => $this->gst_no,
            'pan_no'          => $this->pan_no,
            'cin_no'          => $this->cin_no,
            'iec_no'          => $this->iec_no,
            'tan_no'          => $this->tan_no,
            'registration_no' => $this->registration_no,
            'email'           => $this->email,
            'phone'           => $this->phone,
            'website'         => $this->website,
            'address'         => [
                'line1'       => $this->address_line1,
                'line2'       => $this->address_line2,
                'city'        => $this->city,
                'state'       => $this->state,
                'country'     => $this->country,
                'postal_code' => $this->postal_code,
            ],
            'bill_to' => [
                'line1'       => $this->bill_to_line1,
                'line2'       => $this->bill_to_line2,
                'city'        => $this->bill_to_city,
                'state'       => $this->bill_to_state,
                'country'     => $this->bill_to_country,
                'postal_code' => $this->bill_to_postal_code,
            ],
            'ship_to' => [
                'line1'       => $this->ship_to_line1,
                'line2'       => $this->ship_to_line2,
                'city'        => $this->ship_to_city,
                'state'       => $this->ship_to_state,
                'country'     => $this->ship_to_country,
                'postal_code' => $this->ship_to_postal_code,
            ],
            'currency'          => $this->currency,
            'fiscal_year_start' => $this->fiscal_year_start?->toDateString(),
            'logo_path'         => $this->logo_path,
            'is_active'         => (bool) $this->is_active,
            'meta'              => $this->meta,
            'branches_count'    => $this->whenCounted('branches'),
            'warehouses_count'  => $this->whenCounted('warehouses'),
            'users_count'       => $this->whenCounted('users'),
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
