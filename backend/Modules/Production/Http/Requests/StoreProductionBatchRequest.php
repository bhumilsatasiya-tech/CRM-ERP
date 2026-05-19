<?php

namespace Modules\Production\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductionBatchRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('production.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $batchId = $this->route('batch')?->id;
        return [
            'code'                   => ['nullable', 'string', 'max:64', Rule::unique('production_batches', 'code')->ignore($batchId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'stage'                  => ['nullable', 'string', 'in:trial,final,qc'],
            'parent_batch_id'        => ['nullable', 'integer', 'exists:production_batches,id'],

            'target_product_id'      => ['required', 'integer', 'exists:products,id'],
            'qty_planned'            => ['required', 'numeric', 'gt:0'],
            'raw_warehouse_id'       => ['required', 'integer', 'exists:warehouses,id'],
            'finished_warehouse_id'  => ['required', 'integer', 'exists:warehouses,id'],
            'sales_order_id'         => ['nullable', 'integer', 'exists:sales_orders,id'],

            'planned_start_date'     => ['required', 'date'],
            'planned_end_date'       => ['nullable', 'date', 'after_or_equal:planned_start_date'],

            'output_batch_no'        => ['nullable', 'string', 'max:64'],
            'output_expiry_date'     => ['nullable', 'date'],

            'notes'                  => ['nullable', 'string'],

            'inputs'                          => ['required', 'array', 'min:1'],
            'inputs.*.product_id'             => ['required', 'integer', 'exists:products,id'],
            'inputs.*.qty_planned'            => ['required', 'numeric', 'gt:0'],
            'inputs.*.rate'                   => ['nullable', 'numeric', 'min:0'],
            'inputs.*.source_batch_no'        => ['nullable', 'string', 'max:64'],
            'inputs.*.notes'                  => ['nullable', 'string'],

            'outputs'                         => ['required', 'array', 'min:1'],
            'outputs.*.product_id'            => ['required', 'integer', 'exists:products,id'],
            'outputs.*.output_type'           => ['nullable', 'string', 'in:finished,by_product,scrap'],
            'outputs.*.qty_planned'           => ['required', 'numeric', 'gt:0'],
            'outputs.*.rate'                  => ['nullable', 'numeric', 'min:0'],
            'outputs.*.output_batch_no'       => ['nullable', 'string', 'max:64'],
            'outputs.*.expiry_date'           => ['nullable', 'date'],
            'outputs.*.notes'                 => ['nullable', 'string'],
        ];
    }
}
