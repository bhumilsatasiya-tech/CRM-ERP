<?php

namespace Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockTransferRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('stock.transfer.update') ?? false; }

    public function rules(): array
    {
        return [
            'from_warehouse_id'     => ['sometimes', 'required', 'integer', 'exists:warehouses,id', 'different:to_warehouse_id'],
            'to_warehouse_id'       => ['sometimes', 'required', 'integer', 'exists:warehouses,id'],
            'transfer_date'         => ['nullable', 'date'],
            'expected_arrival_date' => ['nullable', 'date', 'after_or_equal:transfer_date'],
            'notes'                 => ['nullable', 'string'],
            'meta'                  => ['nullable', 'array'],
            'lines'                 => ['nullable', 'array'],
            'lines.*.product_id'    => ['required_with:lines', 'integer', 'exists:products,id'],
            'lines.*.qty'           => ['required_with:lines', 'numeric', 'gt:0'],
            'lines.*.rate'          => ['nullable', 'numeric', 'min:0'],
            'lines.*.batch_no'      => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'   => ['nullable', 'date'],
            'lines.*.serial_no'     => ['nullable', 'string', 'max:128'],
            'lines.*.notes'         => ['nullable', 'string'],
        ];
    }
}
