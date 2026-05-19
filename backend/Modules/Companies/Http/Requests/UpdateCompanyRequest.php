<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('company.update') ?? false;
    }

    public function rules(): array
    {
        $id = $this->route('company')?->id ?? $this->route('company');

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:16',
                'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('companies', 'code')->ignore($id)->whereNull('deleted_at'),
            ],
            'name'              => ['sometimes', 'required', 'string', 'max:255'],
            'legal_name'        => ['nullable', 'string', 'max:255'],
            'type'              => ['sometimes', 'required', 'in:export,supplying,trading,other'],

            'gst_no'            => ['nullable', 'string', 'max:32'],
            'pan_no'            => ['nullable', 'string', 'max:32'],
            'cin_no'            => ['nullable', 'string', 'max:32'],
            'iec_no'            => ['nullable', 'string', 'max:32'],
            'tan_no'            => ['nullable', 'string', 'max:32'],
            'registration_no'   => ['nullable', 'string', 'max:64'],

            'email'             => ['nullable', 'email', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:32'],
            'website'           => ['nullable', 'url', 'max:255'],

            'address_line1'     => ['nullable', 'string', 'max:255'],
            'address_line2'     => ['nullable', 'string', 'max:255'],
            'city'              => ['nullable', 'string', 'max:64'],
            'state'             => ['nullable', 'string', 'max:64'],
            'country'           => ['nullable', 'string', 'max:64'],
            'postal_code'       => ['nullable', 'string', 'max:16'],

            'bill_to_line1'       => ['nullable', 'string', 'max:255'],
            'bill_to_line2'       => ['nullable', 'string', 'max:255'],
            'bill_to_city'        => ['nullable', 'string', 'max:64'],
            'bill_to_state'       => ['nullable', 'string', 'max:64'],
            'bill_to_country'     => ['nullable', 'string', 'max:64'],
            'bill_to_postal_code' => ['nullable', 'string', 'max:16'],

            'ship_to_line1'       => ['nullable', 'string', 'max:255'],
            'ship_to_line2'       => ['nullable', 'string', 'max:255'],
            'ship_to_city'        => ['nullable', 'string', 'max:64'],
            'ship_to_state'       => ['nullable', 'string', 'max:64'],
            'ship_to_country'     => ['nullable', 'string', 'max:64'],
            'ship_to_postal_code' => ['nullable', 'string', 'max:16'],

            'currency'          => ['nullable', 'string', 'max:8'],
            'fiscal_year_start' => ['nullable', 'date'],
            'is_active'         => ['nullable', 'boolean'],
            'meta'              => ['nullable', 'array'],
        ];
    }
}
