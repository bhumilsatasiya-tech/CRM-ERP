<?php

namespace Modules\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class AdminResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('user.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'password'             => ['required', 'confirmed', Password::min(10)->mixedCase()->numbers()->symbols()],
            'must_change_password' => ['nullable', 'boolean'],
        ];
    }
}
