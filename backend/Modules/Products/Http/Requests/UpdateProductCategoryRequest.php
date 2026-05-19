<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductCategoryRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('category.update') ?? false; }

    public function rules(): array
    {
        $cat = $this->route('category');
        $catId = is_object($cat) ? $cat->id : $cat;
        $companyId = is_object($cat) ? $cat->company_id
            : (app()->bound('active_company_id') ? app('active_company_id') : null);

        return [
            'parent_id'   => ['nullable', 'integer', 'exists:product_categories,id'],
            'code'        => [
                'sometimes', 'required', 'string', 'max:32',
                Rule::unique('product_categories', 'code')->ignore($catId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }
}
