<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('warehouse.create') ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->route('company')?->id ?? $this->route('company');

        return [
            'code' => [
                'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('warehouses', 'code')->where('company_id', $companyId)->whereNull('deleted_at'),
            ],
            'name'        => ['required', 'string', 'max:255'],
            'type'        => ['required', 'in:finished,raw,packaging,quarantine,transit,reject,other'],
            'branch_id'   => ['nullable', 'integer', Rule::exists('branches', 'id')->where('company_id', $companyId)],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'city'        => ['nullable', 'string', 'max:64'],
            'state'       => ['nullable', 'string', 'max:64'],
            'country'     => ['nullable', 'string', 'max:64'],
            'postal_code' => ['nullable', 'string', 'max:16'],
            'is_active'   => ['nullable', 'boolean'],
            'is_default'  => ['nullable', 'boolean'],
            'meta'        => ['nullable', 'array'],
        ];
    }
}
