<?php

namespace Modules\Hr\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id,
            'code' => $this->code, 'name' => $this->name,
            'email' => $this->email, 'phone' => $this->phone,
            'designation_id' => $this->designation_id,
            'designation' => $this->whenLoaded('designation', fn() => $this->designation ? ['id' => $this->designation->id, 'name' => $this->designation->name] : null),
            'user_id' => $this->user_id,
            'joining_date'  => $this->joining_date?->toDateString(),
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender, 'status' => $this->status,
            'pan' => $this->pan, 'aadhar' => $this->aadhar,
            'bank_name' => $this->bank_name, 'bank_account_no' => $this->bank_account_no, 'bank_ifsc' => $this->bank_ifsc,
            'notes' => $this->notes,
            'latest_structure' => $this->whenLoaded('structures', fn() => $this->structures->first() ? [
                'effective_from' => $this->structures->first()->effective_from?->toDateString(),
                'basic'          => (float) $this->structures->first()->basic,
                'components'     => $this->structures->first()->components ?? [],
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
