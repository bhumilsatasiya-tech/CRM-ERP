<?php

namespace Modules\Crm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePartnerContactRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('partner.update') ?? false; }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'designation' => ['nullable', 'string', 'max:128'],
            'department'  => ['nullable', 'string', 'max:128'],
            'email'       => ['nullable', 'email', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:32'],
            'mobile'      => ['nullable', 'string', 'max:32'],
            'is_primary'  => ['nullable', 'boolean'],
            'is_active'   => ['nullable', 'boolean'],
            'notes'       => ['nullable', 'string'],
        ];
    }
}
