<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('company.create') ?? false;
    }

    /** Auto-generate a code from the name (or legal_name) when caller leaves it blank. */
    protected function prepareForValidation(): void
    {
        if (!$this->filled('code')) {
            $source = (string) ($this->input('name') ?: $this->input('legal_name') ?: 'CO');
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $source));
            $base = substr($slug, 0, 6) ?: 'CO';
            $code = $base;
            $i = 1;
            while (\Illuminate\Support\Facades\DB::table('companies')->where('code', $code)->whereNull('deleted_at')->exists()) {
                $code = $base . $i++;
                if (strlen($code) > 16) { $code = 'CO' . random_int(1000, 9999); break; }
            }
            $this->merge(['code' => $code]);
        }
    }

    public function rules(): array
    {
        return [
            'code'              => ['nullable', 'string', 'max:16', 'unique:companies,code', 'regex:/^[A-Za-z0-9_-]+$/'],
            'name'              => ['required', 'string', 'max:255'],
            'legal_name'        => ['nullable', 'string', 'max:255'],
            'type'              => ['required', 'in:export,supplying,trading,other'],

            'gst_no'            => ['nullable', 'string', 'max:32'],
            'pan_no'            => ['nullable', 'string', 'max:32'],
            'cin_no'            => ['nullable', 'string', 'max:32'],
            'iec_no'            => ['nullable', 'string', 'max:32'],
            'tan_no'            => ['nullable', 'string', 'max:32'],
            'registration_no'   => ['nullable', 'string', 'max:64'],

            'email'             => ['nullable', 'email', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:32'],
            'website'           => ['nullable', 'url', 'max:255'],

            'address_line1'     => ['nullable', 'string', 'max:255'],
            'address_line2'     => ['nullable', 'string', 'max:255'],
            'city'              => ['nullable', 'string', 'max:64'],
            'state'             => ['nullable', 'string', 'max:64'],
            'country'           => ['nullable', 'string', 'max:64'],
            'postal_code'       => ['nullable', 'string', 'max:16'],

            'bill_to_line1'       => ['nullable', 'string', 'max:255'],
            'bill_to_line2'       => ['nullable', 'string', 'max:255'],
            'bill_to_city'        => ['nullable', 'string', 'max:64'],
            'bill_to_state'       => ['nullable', 'string', 'max:64'],
            'bill_to_country'     => ['nullable', 'string', 'max:64'],
            'bill_to_postal_code' => ['nullable', 'string', 'max:16'],

            'ship_to_line1'       => ['nullable', 'string', 'max:255'],
            'ship_to_line2'       => ['nullable', 'string', 'max:255'],
            'ship_to_city'        => ['nullable', 'string', 'max:64'],
            'ship_to_state'       => ['nullable', 'string', 'max:64'],
            'ship_to_country'     => ['nullable', 'string', 'max:64'],
            'ship_to_postal_code' => ['nullable', 'string', 'max:16'],

            'currency'          => ['nullable', 'string', 'max:8'],
            'fiscal_year_start' => ['nullable', 'date'],
            'is_active'         => ['nullable', 'boolean'],
            'meta'              => ['nullable', 'array'],
        ];
    }
}
