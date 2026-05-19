<?php

namespace Modules\Production\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteProductionBatchRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('production.complete') ?? false; }

    public function rules(): array
    {
        return [
            'actual_end_date'              => ['nullable', 'date'],

            'inputs'                       => ['nullable', 'array'],
            'inputs.*.id'                  => ['required', 'integer', 'exists:production_batch_inputs,id'],
            'inputs.*.qty_consumed'        => ['nullable', 'numeric', 'gt:0'],
            'inputs.*.rate'                => ['nullable', 'numeric', 'min:0'],
            'inputs.*.source_batch_no'     => ['nullable', 'string', 'max:64'],

            'outputs'                      => ['nullable', 'array'],
            'outputs.*.id'                 => ['required', 'integer', 'exists:production_batch_outputs,id'],
            'outputs.*.qty_produced'       => ['nullable', 'numeric', 'min:0'],
            'outputs.*.rate'               => ['nullable', 'numeric', 'min:0'],
            'outputs.*.output_batch_no'    => ['nullable', 'string', 'max:64'],
            'outputs.*.expiry_date'        => ['nullable', 'date'],
        ];
    }
}
