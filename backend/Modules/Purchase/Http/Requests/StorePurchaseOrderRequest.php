<?php

namespace Modules\Purchase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('purchase.order.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $poId = $this->route('order')?->id ?? $this->route('purchase_order')?->id;
        return [
            'code'          => ['nullable', 'string', 'max:64', Rule::unique('purchase_orders', 'code')->ignore($poId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'partner_id'    => ['required', 'integer', 'exists:partners,id'],
            'warehouse_id'  => ['nullable', 'integer', 'exists:warehouses,id'],
            'order_date'    => ['nullable', 'date'],
            'expected_date' => ['nullable', 'date'],
            'reference'     => ['nullable', 'string', 'max:128'],
            'currency'      => ['nullable', 'string', 'max:8'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'tax_type'           => ['nullable', 'string', 'in:cgst_sgst,igst,none'],
            'discount'      => ['nullable', 'numeric', 'min:0'],
            'shipping'      => ['nullable', 'numeric', 'min:0'],
            'notes'         => ['nullable', 'string'],
            'lines'                  => ['required', 'array', 'min:1'],
            'lines.*.product_id'     => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.unit_id'        => ['nullable', 'integer', 'exists:product_units,id'],
            'lines.*.qty'            => ['required', 'numeric', 'gt:0'],
            'lines.*.rate'           => ['required', 'numeric', 'min:0'],
            'lines.*.discount_pct'   => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.tax_rate'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.notes'          => ['nullable', 'string'],
        ];
    }
}
