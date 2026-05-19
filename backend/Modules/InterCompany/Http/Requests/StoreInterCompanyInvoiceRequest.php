<?php

namespace Modules\InterCompany\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInterCompanyInvoiceRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('intercompany.create') ?? false; }

    public function rules(): array
    {
        $iciId = $this->route('ici')?->id;
        $fromCompanyId = (int) $this->input('from_company_id');
        return [
            'code'              => ['nullable', 'string', 'max:64', Rule::unique('inter_company_invoices', 'code')->ignore($iciId)->where(fn($q) => $fromCompanyId ? $q->where('from_company_id', $fromCompanyId) : $q)->whereNull('deleted_at')],
            'from_company_id'   => ['required', 'integer', 'exists:companies,id', 'different:to_company_id'],
            'to_company_id'     => ['required', 'integer', 'exists:companies,id'],
            'from_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id'   => ['required', 'integer', 'exists:warehouses,id'],
            'invoice_date'      => ['required', 'date'],
            'due_date'          => ['nullable', 'date'],
            'currency'          => ['nullable', 'string', 'max:8'],
            'exchange_rate'     => ['nullable', 'numeric', 'gt:0'],
            'tax_type'           => ['nullable', 'string', 'in:cgst_sgst,igst,none'],
            'profit_pct'        => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'notes'             => ['nullable', 'string'],

            'lines'                  => ['required', 'array', 'min:1'],
            'lines.*.product_id'     => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.qty'            => ['required', 'numeric', 'gt:0'],
            'lines.*.cost_rate'      => ['required', 'numeric', 'min:0'],
            'lines.*.sell_rate'      => ['nullable', 'numeric', 'min:0'],
            'lines.*.tax_rate'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.batch_no'       => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'    => ['nullable', 'date'],
            'lines.*.notes'          => ['nullable', 'string'],
        ];
    }
}
