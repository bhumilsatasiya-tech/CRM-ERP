<?php

namespace Modules\Crm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePartnerBankAccountRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('partner.update') ?? false; }

    public function rules(): array
    {
        return [
            'bank_name'      => ['required', 'string', 'max:255'],
            'branch'         => ['nullable', 'string', 'max:255'],
            'account_holder' => ['required', 'string', 'max:255'],
            'account_no'     => ['required', 'string', 'max:64'],
            'account_type'   => ['nullable', 'string', 'max:32'],
            'ifsc'           => ['nullable', 'string', 'max:32'],
            'swift'          => ['nullable', 'string', 'max:32'],
            'iban'           => ['nullable', 'string', 'max:64'],
            'currency'       => ['nullable', 'string', 'max:8'],
            'bank_country'   => ['nullable', 'string', 'max:64'],
            'bank_address'   => ['nullable', 'string', 'max:255'],
            'is_primary'     => ['nullable', 'boolean'],
            'is_active'      => ['nullable', 'boolean'],
            'notes'          => ['nullable', 'string'],
        ];
    }
}
