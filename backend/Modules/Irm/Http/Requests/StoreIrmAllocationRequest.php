<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIrmAllocationRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('irm.update') ?? false; }

    public function rules(): array
    {
        return [
            'export_invoice_id'   => ['required', 'integer', 'exists:export_invoices,id'],
            'shipping_bill_id'    => ['nullable', 'integer', 'exists:shipping_bills,id'],
            'amount_fcy'          => ['required', 'numeric', 'gt:0'],
            'allocation_date'     => ['nullable', 'date'],
            'exchange_rate'       => ['nullable', 'numeric', 'gt:0'],
            'is_full_realization'    => ['nullable', 'boolean'],
            'is_third_party_payment' => ['nullable', 'boolean'],
            'notes'                  => ['nullable', 'string', 'max:255'],
        ];
    }
}
