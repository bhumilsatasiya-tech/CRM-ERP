<?php

namespace Modules\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('role.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'          => [
                'required', 'string', 'max:64', 'regex:/^[a-z0-9\-]+$/',
                Rule::unique('roles', 'name')->where('guard_name', 'api'),
            ],
            'description'   => ['nullable', 'string', 'max:255'],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'api')],
        ];
    }

    public function messages(): array
    {
        return [
            'name.regex' => 'Role name must be lowercase, with letters, numbers and dashes only (e.g. "sales-manager").',
        ];
    }
}
