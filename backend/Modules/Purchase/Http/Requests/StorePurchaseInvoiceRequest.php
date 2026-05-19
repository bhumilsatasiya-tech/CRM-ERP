<?php

namespace Modules\Purchase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseInvoiceRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('purchase.invoice.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $piId = $this->route('invoice')?->id ?? $this->route('purchase_invoice')?->id;
        return [
            'code'               => ['nullable', 'string', 'max:64', Rule::unique('purchase_invoices', 'code')->ignore($piId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'partner_id'         => ['required', 'integer', 'exists:partners,id'],
            'purchase_order_id'  => ['nullable', 'integer', 'exists:purchase_orders,id'],
            'grn_id'             => ['nullable', 'integer', 'exists:grns,id'],
            'supplier_invoice_no'=> ['nullable', 'string', 'max:64'],
            'invoice_date'       => ['required', 'date'],
            'due_date'           => ['nullable', 'date'],
            'currency'           => ['nullable', 'string', 'max:8'],
            'exchange_rate'      => ['nullable', 'numeric', 'gt:0'],
            'tax_type'           => ['nullable', 'string', 'in:cgst_sgst,igst,none'],
            'discount'           => ['nullable', 'numeric', 'min:0'],
            'shipping'           => ['nullable', 'numeric', 'min:0'],
            'notes'              => ['nullable', 'string'],
            'lines'                  => ['required', 'array', 'min:1'],
            'lines.*.product_id'     => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.qty'            => ['required', 'numeric', 'gt:0'],
            'lines.*.rate'           => ['required', 'numeric', 'min:0'],
            'lines.*.discount_pct'   => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.tax_rate'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.notes'          => ['nullable', 'string'],
        ];
    }
}
