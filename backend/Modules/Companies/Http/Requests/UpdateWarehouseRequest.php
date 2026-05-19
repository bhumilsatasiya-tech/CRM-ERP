<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('warehouse.update') ?? false;
    }

    public function rules(): array
    {
        $warehouse   = $this->route('warehouse');
        $warehouseId = is_object($warehouse) ? $warehouse->id : $warehouse;
        $companyId   = is_object($warehouse) ? $warehouse->company_id : null;

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('warehouses', 'code')
                    ->ignore($warehouseId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'type'        => ['sometimes', 'required', 'in:finished,raw,packaging,quarantine,transit,reject,other'],
            'branch_id'   => ['nullable', 'integer', Rule::exists('branches', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)],
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
