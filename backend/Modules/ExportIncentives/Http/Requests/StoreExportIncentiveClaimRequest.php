<?php

namespace Modules\ExportIncentives\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExportIncentiveClaimRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('export.incentive.create') ?? false; }

    public function rules(): array
    {
        return [
            'type'              => ['required', 'in:drawback,igst_refund,rodtep'],
            'shipping_bill_id'  => ['nullable', 'integer', 'exists:shipping_bills,id'],
            'export_invoice_id' => ['nullable', 'integer', 'exists:export_invoices,id'],
            'claim_no'          => ['nullable', 'string', 'max:64'],
            'claim_date'        => ['required', 'date'],
            'claim_amount'      => ['required', 'numeric', 'gt:0'],
            'claim_currency'    => ['nullable', 'string', 'max:8'],
            'status'            => ['nullable', 'in:pending,filed,approved,credited,rejected'],
            'credited_amount'   => ['nullable', 'numeric', 'min:0'],
            'credited_date'     => ['nullable', 'date'],
            'bank_ref'          => ['nullable', 'string', 'max:128'],
            'rejection_reason'  => ['nullable', 'string', 'max:255'],
            'notes'             => ['nullable', 'string'],
            'meta'              => ['nullable', 'array'],
        ];
    }
}
