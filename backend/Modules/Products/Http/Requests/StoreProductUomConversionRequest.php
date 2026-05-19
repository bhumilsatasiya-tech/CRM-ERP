<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductUomConversionRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('product.update') ?? false; }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = is_object($product) ? $product->id : $product;

        return [
            'unit_id' => [
                'required', 'integer', 'exists:product_units,id',
                Rule::unique('product_uom_conversions', 'unit_id')
                    ->where(fn($q) => $q->where('product_id', $productId))
                    ->whereNull('deleted_at'),
            ],
            'conversion_factor'   => ['required', 'numeric', 'gt:0'],
            'is_purchase_default' => ['nullable', 'boolean'],
            'is_sales_default'    => ['nullable', 'boolean'],
            'notes'               => ['nullable', 'string'],
            'is_active'           => ['nullable', 'boolean'],
        ];
    }
}
