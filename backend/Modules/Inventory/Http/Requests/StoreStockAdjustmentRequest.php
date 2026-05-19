<?php

namespace Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('stock.adjustment.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $adjId = $this->route('adjustment')?->id;
        return [
            'code'            => ['nullable', 'string', 'max:64', Rule::unique('stock_adjustments', 'code')->ignore($adjId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'warehouse_id'    => ['required', 'integer', 'exists:warehouses,id'],
            'adjustment_date' => ['nullable', 'date'],
            'reason'          => ['nullable', 'string', 'max:64'],
            'notes'           => ['nullable', 'string'],
            'meta'            => ['nullable', 'array'],
            'lines'           => ['required', 'array', 'min:1'],
            'lines.*.product_id'  => ['required', 'integer', 'exists:products,id'],
            'lines.*.current_qty' => ['nullable', 'numeric'],
            'lines.*.counted_qty' => ['required', 'numeric'],
            'lines.*.rate'        => ['nullable', 'numeric', 'min:0'],
            'lines.*.batch_no'    => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date' => ['nullable', 'date'],
            'lines.*.serial_no'   => ['nullable', 'string', 'max:128'],
            'lines.*.notes'       => ['nullable', 'string'],
        ];
    }
}
