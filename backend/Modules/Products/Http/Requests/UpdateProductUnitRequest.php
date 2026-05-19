<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductUnitRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('unit.update') ?? false; }

    public function rules(): array
    {
        $unit = $this->route('unit');
        $unitId = is_object($unit) ? $unit->id : $unit;
        $companyId = is_object($unit) ? $unit->company_id
            : (app()->bound('active_company_id') ? app('active_company_id') : null);

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:16',
                Rule::unique('product_units', 'code')->ignore($unitId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'              => ['sometimes', 'required', 'string', 'max:64'],
            'formal_name'       => ['nullable', 'string', 'max:128'],
            'symbol'            => ['sometimes', 'required', 'string', 'max:16'],
            'uqc'               => ['nullable', 'string', 'max:8'],
            'type'              => ['sometimes', 'required', 'in:weight,volume,count,length,area,time,other'],
            'base_unit_id'      => ['nullable', 'integer', 'exists:product_units,id'],
            'conversion_factor' => ['nullable', 'numeric', 'gt:0'],
            'is_base'           => ['nullable', 'boolean'],
            'decimals_allowed'  => ['nullable', 'integer', 'min:0', 'max:8'],
            'is_active'         => ['nullable', 'boolean'],
        ];
    }
}
