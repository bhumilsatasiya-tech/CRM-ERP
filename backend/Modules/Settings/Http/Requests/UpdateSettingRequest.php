<?php

namespace Modules\Settings\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('setting.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'value'       => ['present'],
            'label'       => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'options'     => ['nullable', 'array'],
            'is_public'   => ['nullable', 'boolean'],
        ];
    }
}
