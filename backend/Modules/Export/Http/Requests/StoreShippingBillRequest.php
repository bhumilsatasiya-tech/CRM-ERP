<?php

namespace Modules\Export\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShippingBillRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('export.shipping.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $sbId = $this->route('shippingBill')?->id ?? $this->route('shipping_bill')?->id;
        return [
            'code'              => ['nullable', 'string', 'max:64', Rule::unique('shipping_bills', 'code')->ignore($sbId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'export_invoice_id' => ['required', 'integer', 'exists:export_invoices,id'],
            'warehouse_id'      => ['required', 'integer', 'exists:warehouses,id'],
            'bl_no'             => ['nullable', 'string', 'max:64'],
            'bl_date'           => ['nullable', 'date'],
            'vessel_name'       => ['nullable', 'string', 'max:128'],
            'voyage_no'         => ['nullable', 'string', 'max:64'],
            'carrier'           => ['nullable', 'string', 'max:128'],
            'container_no'      => ['nullable', 'string', 'max:64'],
            'port_of_loading'   => ['nullable', 'string', 'max:128'],
            'port_of_discharge' => ['nullable', 'string', 'max:128'],
            'etd'               => ['nullable', 'date'],
            'eta'               => ['nullable', 'date'],
            'notes'             => ['nullable', 'string'],

            'lines'                          => ['required', 'array', 'min:1'],
            'lines.*.export_invoice_item_id' => ['nullable', 'integer', 'exists:export_invoice_items,id'],
            'lines.*.product_id'             => ['required', 'integer', 'exists:products,id'],
'lines.*.hsn_code'     => ['nullable', 'string', 'max:16'],
            'lines.*.qty'                    => ['required', 'numeric', 'gt:0'],
            'lines.*.batch_no'               => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'            => ['nullable', 'date'],
            'lines.*.notes'                  => ['nullable', 'string'],
        ];
    }
}
