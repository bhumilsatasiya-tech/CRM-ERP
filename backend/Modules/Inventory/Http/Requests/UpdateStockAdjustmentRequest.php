<?php

namespace Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('stock.adjustment.update') ?? false; }

    public function rules(): array
    {
        return [
            'warehouse_id'    => ['sometimes', 'required', 'integer', 'exists:warehouses,id'],
            'adjustment_date' => ['nullable', 'date'],
            'reason'          => ['nullable', 'string', 'max:64'],
            'notes'           => ['nullable', 'string'],
            'meta'            => ['nullable', 'array'],
            'lines'           => ['nullable', 'array'],
            'lines.*.product_id'  => ['required_with:lines', 'integer', 'exists:products,id'],
            'lines.*.current_qty' => ['nullable', 'numeric'],
            'lines.*.counted_qty' => ['required_with:lines', 'numeric'],
            'lines.*.rate'        => ['nullable', 'numeric', 'min:0'],
            'lines.*.batch_no'    => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date' => ['nullable', 'date'],
            'lines.*.serial_no'   => ['nullable', 'string', 'max:128'],
            'lines.*.notes'       => ['nullable', 'string'],
        ];
    }
}
