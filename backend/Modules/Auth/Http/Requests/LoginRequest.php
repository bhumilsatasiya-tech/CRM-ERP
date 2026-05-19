<?php

namespace Modules\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'       => ['required', 'email', 'max:255'],
            'password'    => ['required', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:64'],
            'remember'    => ['nullable', 'boolean'],
        ];
    }
}
