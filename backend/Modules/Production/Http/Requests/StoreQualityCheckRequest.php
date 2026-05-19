<?php

namespace Modules\Production\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQualityCheckRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('production.quality.record') ?? false; }

    public function rules(): array
    {
        return [
            'checked_at' => ['nullable', 'date'],
            'result'     => ['required', 'string', 'in:pass,fail'],
            'parameter'  => ['nullable', 'string', 'max:255'],
            'expected'   => ['nullable', 'string', 'max:255'],
            'observed'   => ['nullable', 'string', 'max:255'],
            'notes'      => ['nullable', 'string'],
        ];
    }
}
