<?php

namespace Modules\Products\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('product.update') ?? false; }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = is_object($product) ? $product->id : $product;
        $companyId = is_object($product) ? $product->company_id
            : (app()->bound('active_company_id') ? app('active_company_id') : null);

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:64',
                Rule::unique('products', 'code')->ignore($productId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'barcode'              => ['nullable', 'string', 'max:64'],
            'name'                 => ['sometimes', 'required', 'string', 'max:255'],
            'description'          => ['nullable', 'string'],

            'category_id'          => ['nullable', 'integer', 'exists:product_categories,id'],
            'type'                 => ['sometimes', 'required', 'in:raw,finished,packaging,consumable,service,other'],
            'is_company_made'      => ['nullable', 'boolean'],

            'unit_id'              => ['sometimes', 'required', 'integer', 'exists:product_units,id'],

            'hsn_code'             => ['nullable', 'string', 'max:16'],
            'tax_rate'             => ['nullable', 'numeric', 'min:0', 'max:100'],

            'standard_cost'        => ['nullable', 'numeric', 'min:0'],
            'last_purchase_cost'   => ['nullable', 'numeric', 'min:0'],
            'opening_stock_qty'    => ['nullable', 'numeric'],
            'opening_stock_value'  => ['nullable', 'numeric'],

            'standard_price'       => ['nullable', 'numeric', 'min:0'],
            'mrp'                  => ['nullable', 'numeric', 'min:0'],
            'currency'             => ['nullable', 'string', 'max:8'],

            'reorder_level'        => ['nullable', 'numeric', 'min:0'],
            'reorder_qty'          => ['nullable', 'numeric', 'min:0'],
            'min_stock'            => ['nullable', 'numeric', 'min:0'],
            'max_stock'            => ['nullable', 'numeric', 'min:0'],
            'lead_time_days'       => ['nullable', 'integer', 'min:0'],
            'shelf_life_days'      => ['nullable', 'integer', 'min:0'],

            'has_batches'          => ['nullable', 'boolean'],
            'has_expiry'           => ['nullable', 'boolean'],
            'has_serials'          => ['nullable', 'boolean'],

            'default_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],

            'is_active'            => ['nullable', 'boolean'],
            'is_purchasable'       => ['nullable', 'boolean'],
            'is_sellable'          => ['nullable', 'boolean'],
            'is_stockable'         => ['nullable', 'boolean'],

            'weight'               => ['nullable', 'numeric', 'min:0'],
            'weight_unit_id'       => ['nullable', 'integer', 'exists:product_units,id'],
            'length'               => ['nullable', 'numeric', 'min:0'],
            'width'                => ['nullable', 'numeric', 'min:0'],
            'height'               => ['nullable', 'numeric', 'min:0'],

            'image_path'           => ['nullable', 'string', 'max:255'],
            'meta'                 => ['nullable', 'array'],
            'notes'                => ['nullable', 'string'],
        ];
    }
}
