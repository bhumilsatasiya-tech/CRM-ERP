<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLodgementRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('lodgement.create') ?? false; }

    public function rules(): array
    {
        return [
            'partner_id'        => ['required', 'integer', 'exists:partners,id'],
            'lodgement_date'    => ['required', 'date'],
            'bank_receipt_no'   => ['nullable', 'string', 'max:64'],
            'bank_receipt_date' => ['nullable', 'date'],
            'notes'             => ['nullable', 'string'],

            'rows'                          => ['required', 'array', 'min:1'],
            'rows.*.irm_id'                 => ['required', 'integer', 'exists:irms,id'],
            'rows.*.export_invoice_id'      => ['required', 'integer', 'exists:export_invoices,id'],
            'rows.*.amount_fcy'             => ['required', 'numeric', 'gt:0'],
            'rows.*.exchange_rate'          => ['nullable', 'numeric', 'gt:0'],
            'rows.*.is_full_realization'    => ['nullable', 'boolean'],
            'rows.*.is_third_party_payment' => ['nullable', 'boolean'],
            'rows.*.notes'                  => ['nullable', 'string', 'max:255'],
        ];
    }
}
