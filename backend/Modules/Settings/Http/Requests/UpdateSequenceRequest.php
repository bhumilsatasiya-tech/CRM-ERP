<?php

namespace Modules\Settings\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSequenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sequence.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'           => ['sometimes', 'required', 'string', 'max:128'],
            'prefix'         => ['nullable', 'string', 'max:16'],
            'suffix'         => ['nullable', 'string', 'max:16'],
            'current_number' => ['nullable', 'integer', 'min:0'],
            'padding'        => ['nullable', 'integer', 'min:1', 'max:12'],
            'format'         => ['sometimes', 'required', 'string', 'max:128'],
            'reset_period'   => ['sometimes', 'required', 'in:never,yearly,monthly'],
            'is_active'      => ['nullable', 'boolean'],
        ];
    }
}
