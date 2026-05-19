<?php

namespace Modules\Quotation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuotationRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('quotation.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $qId = $this->route('quotation')?->id;
        return [
            'code'                 => ['nullable', 'string', 'max:64', Rule::unique('quotations', 'code')->ignore($qId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'partner_id'           => ['required', 'integer', 'exists:partners,id'],
            'quotation_date'       => ['nullable', 'date'],
            'valid_until'          => ['nullable', 'date'],
            'reference'            => ['nullable', 'string', 'max:128'],
            'currency'             => ['nullable', 'string', 'max:8'],
            'exchange_rate'        => ['nullable', 'numeric', 'gt:0'],
            'tax_type'           => ['nullable', 'string', 'in:cgst_sgst,igst,none'],
            'discount'             => ['nullable', 'numeric', 'min:0'],
            'shipping'             => ['nullable', 'numeric', 'min:0'],
            'terms_and_conditions' => ['nullable', 'string'],
            'notes'                => ['nullable', 'string'],
            'lines'                => ['required', 'array', 'min:1'],
            'lines.*.product_id'   => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.qty'          => ['required', 'numeric', 'gt:0'],
            'lines.*.rate'         => ['required', 'numeric', 'min:0'],
            'lines.*.discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.tax_rate'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.notes'        => ['nullable', 'string'],
        ];
    }
}
