<?php

namespace Modules\Crm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('partner.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $country = strtoupper((string) $this->input('country', ''));
        if ($country !== '' && $country !== 'IN') {
            $this->merge(['country' => $country, 'tax_treatment' => 'overseas']);
        } elseif ($country !== '') {
            $this->merge(['country' => $country]);
        }

        // Auto-generate code from name when blank (mirrors Company form pattern).
        if (!$this->filled('code')) {
            $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
            $source = (string) ($this->input('name') ?: $this->input('legal_name') ?: 'P');
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $source));
            $base = substr($slug, 0, 8) ?: 'P';
            $code = $base;
            $i = 1;
            while (\Illuminate\Support\Facades\DB::table('partners')
                ->where('code', $code)
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->whereNull('deleted_at')->exists()
            ) {
                $code = $base . $i++;
                if (strlen($code) > 32) { $code = 'P' . random_int(10000, 99999); break; }
            }
            $this->merge(['code' => $code]);
        }
    }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;

        return [
            'code' => [
                'nullable', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('partners', 'code')
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'                       => ['required', 'string', 'max:255'],
            'legal_name'                 => ['nullable', 'string', 'max:255'],
            'is_company'                 => ['nullable', 'boolean'],
            'type'                       => ['required', 'in:client,supplier,vendor,manufacturer,importer,employee,logistic,other'],

            'email'                      => ['nullable', 'email', 'max:255'],
            'phone'                      => ['nullable', 'string', 'max:32'],
            'mobile'                     => ['nullable', 'string', 'max:32'],
            'website'                    => ['nullable', 'url', 'max:255'],
            'country'                    => ['required', 'string', 'size:2'],

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
