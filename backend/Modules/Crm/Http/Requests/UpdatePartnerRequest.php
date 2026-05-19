<?php

namespace Modules\Crm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('partner.update') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('country')) return;
        $country = strtoupper((string) $this->input('country', ''));
        if ($country !== '' && $country !== 'IN') {
            $this->merge(['country' => $country, 'tax_treatment' => 'overseas']);
        } elseif ($country !== '') {
            $this->merge(['country' => $country]);
        }
    }

    public function rules(): array
    {
        $partner = $this->route('partner');
        $partnerId = is_object($partner) ? $partner->id : $partner;
        $companyId = is_object($partner) ? $partner->company_id
            : (app()->bound('active_company_id') ? app('active_company_id') : null);

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('partners', 'code')
                    ->ignore($partnerId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'                       => ['sometimes', 'required', 'string', 'max:255'],
            'legal_name'                 => ['nullable', 'string', 'max:255'],
            'is_company'                 => ['nullable', 'boolean'],
            'type'                       => ['sometimes', 'required', 'in:client,supplier,vendor,manufacturer,importer,employee,logistic,other'],

            'email'                      => ['nullable', 'email', 'max:255'],
            'phone'                      => ['nullable', 'string', 'max:32'],
            'mobile'                     => ['nullable', 'string', 'max:32'],
            'website'                    => ['nullable', 'url', 'max:255'],
            'country'                    => ['sometimes', 'required', 'string', 'size:2'],

            'gst_no'                     => ['nullable', 'string', 'max:32'],
            'pan_no'                     => ['nullable', 'string', 'max:32'],
            'vat_no'                     => ['nullable', 'string', 'max:32'],
            'cin_no'                     => ['nullable', 'string', 'max:32'],
            'tax_treatment'              => ['nullable', 'in:registered,unregistered,composition,sez,overseas'],

            'industry'                   => ['nullable', 'string', 'max:64'],
            'segment'                    => ['nullable', 'in:b2b,b2c,distributor,oem,other'],

            'currency'                   => ['nullable', 'string', 'max:8'],
            'credit_limit'               => ['nullable', 'numeric', 'min:0'],
            'credit_days'                => ['nullable', 'integer', 'min:0'],
            'opening_balance'            => ['nullable', 'numeric'],
            'opening_balance_type'       => ['nullable', 'in:debit,credit'],
            'default_payment_terms_days' => ['nullable', 'integer', 'min:0'],

            'default_warehouse_id'       => ['nullable', 'integer', 'exists:warehouses,id'],

            'is_active'                  => ['nullable', 'boolean'],
            'is_blacklisted'             => ['nullable', 'boolean'],
            'blacklist_reason'           => ['nullable', 'string', 'max:255'],

            'notes'                      => ['nullable', 'string'],
            'meta'                       => ['nullable', 'array'],
        ];
    }
}
