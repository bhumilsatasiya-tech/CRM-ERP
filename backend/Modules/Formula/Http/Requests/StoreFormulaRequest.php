<?php

namespace Modules\Formula\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFormulaRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('formula.create') ?? false; }

    public function rules(): array
    {
        return [
            'target_product_id'        => ['required', 'integer', 'exists:products,id'],
            'output_qty'               => ['required', 'numeric', 'gt:0'],
            'output_uom_id'            => ['nullable', 'integer', 'exists:product_units,id'],
            'notes'                    => ['nullable', 'string'],

            'components'                       => ['required', 'array', 'min:1'],
            'components.*.product_id'          => ['required', 'integer', 'exists:products,id'],
            'components.*.uom_id'              => ['nullable', 'integer', 'exists:product_units,id'],
            'components.*.qty'                 => ['required', 'numeric', 'gt:0'],
            'components.*.wastage_pct'         => ['nullable', 'numeric', 'min:0', 'max:100'],
            'components.*.notes'               => ['nullable', 'string'],
        ];
    }
}
