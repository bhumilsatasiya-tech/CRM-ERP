<?php

namespace Modules\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('user.update') ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? $this->route('user');

        return [
            'name'              => ['sometimes', 'required', 'string', 'max:255'],
            'email'             => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId)->whereNull('deleted_at'),
            ],
            'phone'             => ['nullable', 'string', 'max:32'],
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
