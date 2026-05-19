<?php

namespace Modules\Settings\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSequenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sequence.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'company_id' => [
                'required', 'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'doc_type' => [
                'required', 'string', 'max:64',
                Rule::unique('sequences', 'doc_type')
                    ->where('company_id', $this->input('company_id'))
                    ->whereNull('deleted_at'),
            ],
            'name'           => ['required', 'string', 'max:128'],
            'prefix'         => ['nullable', 'string', 'max:16'],
            'suffix'         => ['nullable', 'string', 'max:16'],
            'current_number' => ['nullable', 'integer', 'min:0'],
            'padding'        => ['nullable', 'integer', 'min:1', 'max:12'],
            'format'         => ['required', 'string', 'max:128'],
            'reset_period'   => ['required', 'in:never,yearly,monthly'],
            'is_active'      => ['nullable', 'boolean'],
        ];
    }
}
