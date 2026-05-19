<?php

namespace Modules\Formula\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFormulaRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('formula.update') ?? false; }

    public function rules(): array
    {
        return [
            'target_product_id'        => ['sometimes', 'integer', 'exists:products,id'],
            'output_qty'               => ['sometimes', 'numeric', 'gt:0'],
            'output_uom_id'            => ['nullable', 'integer', 'exists:product_units,id'],
            'notes'                    => ['nullable', 'string'],

            'components'                       => ['sometimes', 'array', 'min:1'],
            'components.*.product_id'          => ['required_with:components', 'integer', 'exists:products,id'],
            'components.*.uom_id'              => ['nullable', 'integer', 'exists:product_units,id'],
            'components.*.qty'                 => ['required_with:components', 'numeric', 'gt:0'],
            'components.*.wastage_pct'         => ['nullable', 'numeric', 'min:0', 'max:100'],
            'components.*.notes'               => ['nullable', 'string'],
        ];
    }
}
