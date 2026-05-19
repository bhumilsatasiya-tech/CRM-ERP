<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreIrmRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('irm.create') ?? false; }

    public function rules(): array
    {
        return [
            'code'                  => ['nullable', 'string', 'max:64'],
            'purpose'               => ['nullable', 'string', 'in:advance,against_invoice'],
            'partner_id'            => ['required_without:export_invoice_id', 'nullable', 'integer', 'exists:partners,id'],
            'export_invoice_id'     => ['nullable', 'integer', 'exists:export_invoices,id'],
            'purchase_order_ref'    => ['nullable', 'string', 'max:128'],
            'proforma_invoice_no'   => ['nullable', 'string', 'max:64'],
            'bank_name'             => ['nullable', 'string', 'max:128'],
            'remitter_name'         => ['nullable', 'string', 'max:255'],
            'bank_ref_no'           => ['nullable', 'string', 'max:128'],
            'irm_date'              => ['required', 'date'],
            'irm_amount_fcy'        => ['required', 'numeric', 'gt:0'],
            'irm_currency'          => ['required', 'string', 'max:8'],
            'exchange_rate'         => ['nullable', 'numeric', 'gt:0'],
            'purpose_code'          => ['nullable', 'string', 'max:16'],
            'notes'                 => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $v): void
    {
        // Legacy 'against_invoice' mode still requires an EI when explicitly chosen.
        // Default + advance modes only need a partner (already enforced via 'required' above).
        $v->after(function (Validator $v) {
            if ($this->input('purpose') === 'against_invoice' && !$this->input('export_invoice_id')) {
                $v->errors()->add('export_invoice_id', 'Export invoice is required only when using the legacy against-invoice mode.');
            }
        });
    }
}
