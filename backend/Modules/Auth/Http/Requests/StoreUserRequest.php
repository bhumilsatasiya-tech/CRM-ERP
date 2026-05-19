<?php

namespace Modules\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('user.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:255'],
            'email'             => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'             => ['nullable', 'string', 'max:32'],
            'password'          => ['required', 'confirmed', Password::min(10)->mixedCase()->numbers()->symbols()],
            'is_active'         => ['nullable', 'boolean'],
            'default_company_id'=> ['nullable', 'integer', 'min:1'],
            'locale'            => ['nullable', 'string', 'in:en,hi'],
            'timezone'          => ['nullable', 'string', 'max:64'],
            'roles'             => ['nullable', 'array'],
            'roles.*'           => ['string', Rule::exists('roles', 'name')->where('guard_name', 'api')],
            'must_change_password' => ['nullable', 'boolean'],
        ];
    }
}
