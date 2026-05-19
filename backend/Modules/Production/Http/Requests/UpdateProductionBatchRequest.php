<?php

namespace Modules\Production\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductionBatchRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('production.update') ?? false; }

    public function rules(): array
    {
        return [
            'target_product_id'      => ['sometimes', 'integer', 'exists:products,id'],
            'qty_planned'            => ['sometimes', 'numeric', 'gt:0'],
            'raw_warehouse_id'       => ['sometimes', 'integer', 'exists:warehouses,id'],
            'finished_warehouse_id'  => ['sometimes', 'integer', 'exists:warehouses,id'],
            'sales_order_id'         => ['nullable', 'integer', 'exists:sales_orders,id'],

            'planned_start_date'     => ['sometimes', 'date'],
            'planned_end_date'       => ['nullable', 'date', 'after_or_equal:planned_start_date'],

            'output_batch_no'        => ['nullable', 'string', 'max:64'],
            'output_expiry_date'     => ['nullable', 'date'],

            'notes'                  => ['nullable', 'string'],

            'inputs'                          => ['sometimes', 'array', 'min:1'],
            'inputs.*.product_id'             => ['required_with:inputs', 'integer', 'exists:products,id'],
            'inputs.*.qty_planned'            => ['required_with:inputs', 'numeric', 'gt:0'],
            'inputs.*.rate'                   => ['nullable', 'numeric', 'min:0'],
            'inputs.*.source_batch_no'        => ['nullable', 'string', 'max:64'],
            'inputs.*.notes'                  => ['nullable', 'string'],

            'outputs'                         => ['sometimes', 'array', 'min:1'],
            'outputs.*.product_id'            => ['required_with:outputs', 'integer', 'exists:products,id'],
            'outputs.*.output_type'           => ['nullable', 'string', 'in:finished,by_product,scrap'],
            'outputs.*.qty_planned'           => ['required_with:outputs', 'numeric', 'gt:0'],
            'outputs.*.rate'                  => ['nullable', 'numeric', 'min:0'],
            'outputs.*.output_batch_no'       => ['nullable', 'string', 'max:64'],
            'outputs.*.expiry_date'           => ['nullable', 'date'],
            'outputs.*.notes'                 => ['nullable', 'string'],
        ];
    }
}
