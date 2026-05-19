<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductCategoryRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('category.create') ?? false; }

    protected function prepareForValidation(): void
    {
        if (!$this->filled('code')) {
            $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
            $source = (string) ($this->input('name') ?: 'CAT');
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $source));
            $base = substr($slug, 0, 8) ?: 'CAT';
            $code = $base;
            $i = 1;
            while (\Illuminate\Support\Facades\DB::table('product_categories')
                ->where('code', $code)
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->whereNull('deleted_at')->exists()
            ) {
                $code = $base . $i++;
                if (strlen($code) > 32) { $code = 'CAT' . random_int(1000, 9999); break; }
            }
            $this->merge(['code' => $code]);
        }
    }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        return [
            'parent_id'   => ['nullable', 'integer', 'exists:product_categories,id'],
            'code'        => [
                'nullable', 'string', 'max:32',
                Rule::unique('product_categories', 'code')
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }
}
