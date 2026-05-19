<?php

namespace Modules\Crm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePartnerAddressRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('partner.update') ?? false; }

    public function rules(): array
    {
        return [
            'type'              => ['required', 'in:billing,shipping,registered,branch'],
            'label'             => ['nullable', 'string', 'max:64'],
            'contact_name'      => ['nullable', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:32'],
            'email'             => ['nullable', 'email', 'max:255'],
            'line1'             => ['required', 'string', 'max:255'],
            'line2'             => ['nullable', 'string', 'max:255'],
            'landmark'          => ['nullable', 'string', 'max:255'],
            'city'              => ['nullable', 'string', 'max:64'],
            'state'             => ['nullable', 'string', 'max:64'],
            'country'           => ['nullable', 'string', 'max:64'],
            'postal_code'       => ['nullable', 'string', 'max:16'],
            'gst_no_at_address' => ['nullable', 'string', 'max:32'],
            'is_primary'        => ['nullable', 'boolean'],
            'is_active'         => ['nullable', 'boolean'],
        ];
    }
}
