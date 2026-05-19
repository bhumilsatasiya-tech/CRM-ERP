<?php

namespace Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockTransferRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('stock.transfer.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $trId = $this->route('transfer')?->id;
        return [
            'code'                  => ['nullable', 'string', 'max:64', Rule::unique('stock_transfers', 'code')->ignore($trId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'from_warehouse_id'     => ['required', 'integer', 'exists:warehouses,id', 'different:to_warehouse_id'],
            'to_warehouse_id'       => ['required', 'integer', 'exists:warehouses,id'],
            'transfer_date'         => ['nullable', 'date'],
            'expected_arrival_date' => ['nullable', 'date', 'after_or_equal:transfer_date'],
            'notes'                 => ['nullable', 'string'],
            'meta'                  => ['nullable', 'array'],
            'lines'                 => ['required', 'array', 'min:1'],
            'lines.*.product_id'    => ['required', 'integer', 'exists:products,id'],
            'lines.*.qty'           => ['required', 'numeric', 'gt:0'],
            'lines.*.rate'          => ['nullable', 'numeric', 'min:0'],
            'lines.*.batch_no'      => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'   => ['nullable', 'date'],
            'lines.*.serial_no'     => ['nullable', 'string', 'max:128'],
            'lines.*.notes'         => ['nullable', 'string'],
        ];
    }
}
