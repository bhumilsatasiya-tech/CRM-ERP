<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductUnitRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('unit.create') ?? false; }

    protected function prepareForValidation(): void
    {
        if (!$this->filled('code')) {
            $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
            $source = (string) ($this->input('symbol') ?: $this->input('name') ?: 'U');
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $source));
            $base = substr($slug, 0, 8) ?: 'U';
            $code = $base;
            $i = 1;
            while (\Illuminate\Support\Facades\DB::table('product_units')
                ->where('code', $code)
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->whereNull('deleted_at')->exists()
            ) {
                $code = $base . $i++;
                if (strlen($code) > 16) { $code = 'U' . random_int(100, 9999); break; }
            }
            $this->merge(['code' => $code]);
        }
    }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        return [
            'code' => [
                'nullable', 'string', 'max:16',
                Rule::unique('product_units', 'code')
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'              => ['required', 'string', 'max:64'],
            'formal_name'       => ['nullable', 'string', 'max:128'],
            'symbol'            => ['required', 'string', 'max:16'],
            'uqc'               => ['nullable', 'string', 'max:8'],
            'type'              => ['required', 'in:weight,volume,count,length,area,time,other'],
            'base_unit_id'      => ['nullable', 'integer', 'exists:product_units,id'],
            'conversion_factor' => ['nullable', 'numeric', 'gt:0'],
            'is_base'           => ['nullable', 'boolean'],
            'decimals_allowed'  => ['nullable', 'integer', 'min:0', 'max:8'],
            'is_active'         => ['nullable', 'boolean'],
        ];
    }
}
