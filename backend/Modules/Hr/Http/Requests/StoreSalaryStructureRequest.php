<?php

namespace Modules\Hr\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalaryStructureRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('hr.salary.structure.edit') ?? false; }

    public function rules(): array
    {
        return [
            'effective_from'              => ['required', 'date'],
            'basic'                       => ['required', 'numeric', 'min:0'],
            'components'                  => ['nullable', 'array'],
            'components.*.code'           => ['nullable', 'string'],
            'components.*.name'           => ['required_with:components', 'string'],
            'components.*.type'           => ['required_with:components', 'string', 'in:earning,deduction'],
            'components.*.formula_type'   => ['required_with:components', 'string', 'in:fixed,percent_of_basic'],
            'components.*.formula_value'  => ['required_with:components', 'numeric', 'min:0'],
            'notes'                       => ['nullable', 'string'],
        ];
    }
}
