<?php

namespace Modules\Purchase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGrnRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('purchase.grn.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $grnId = $this->route('grn')?->id;
        return [
            'code'                 => ['nullable', 'string', 'max:64', Rule::unique('grns', 'code')->ignore($grnId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'purchase_order_id'    => ['nullable', 'integer', 'exists:purchase_orders,id'],
            'partner_id'           => ['required', 'integer', 'exists:partners,id'],
            'warehouse_id'         => ['required', 'integer', 'exists:warehouses,id'],
            'grn_date'             => ['nullable', 'date'],
            'supplier_invoice_no'  => ['nullable', 'string', 'max:64'],
            'supplier_invoice_date'=> ['nullable', 'date'],
            'vehicle_no'           => ['nullable', 'string', 'max:32'],
            'lr_no'                => ['nullable', 'string', 'max:32'],
            'notes'                => ['nullable', 'string'],
            'lines'                            => ['required', 'array', 'min:1'],
            'lines.*.purchase_order_item_id'   => ['nullable', 'integer', 'exists:purchase_order_items,id'],
            'lines.*.product_id'               => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.qty'                      => ['required', 'numeric', 'gt:0'],
            'lines.*.rate'                     => ['nullable', 'numeric', 'min:0'],
            'lines.*.batch_no'                 => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'              => ['nullable', 'date'],
            'lines.*.manufacturing_date'       => ['nullable', 'date'],
            'lines.*.serial_no'                => ['nullable', 'string', 'max:128'],
            'lines.*.notes'                    => ['nullable', 'string'],
        ];
    }
}
