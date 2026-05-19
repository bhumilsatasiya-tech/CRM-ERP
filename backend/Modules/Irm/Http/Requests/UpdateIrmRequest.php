<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIrmRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('irm.update') ?? false; }

    public function rules(): array
    {
        return [
            'bank_name'           => ['nullable', 'string', 'max:128'],
            'remitter_name'       => ['nullable', 'string', 'max:255'],
            'bank_ref_no'         => ['nullable', 'string', 'max:128'],
            'irm_date'            => ['sometimes', 'date'],
            'irm_amount_fcy'      => ['sometimes', 'numeric', 'gt:0'],
            'irm_currency'        => ['nullable', 'string', 'max:8'],
            'exchange_rate'       => ['nullable', 'numeric', 'gt:0'],
            'purpose'             => ['nullable', 'string', 'in:advance,against_invoice'],
            'partner_id'          => ['nullable', 'integer', 'exists:partners,id'],
            'purchase_order_ref'  => ['nullable', 'string', 'max:128'],
            'proforma_invoice_no' => ['nullable', 'string', 'max:64'],
            'purpose_code'        => ['nullable', 'string', 'max:16'],
            'notes'               => ['nullable', 'string'],
        ];
    }
}
