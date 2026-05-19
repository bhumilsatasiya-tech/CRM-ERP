<?php

namespace Modules\Export\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaxInvoiceRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('export.taxinvoice.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $tiId = $this->route('taxInvoice')?->id ?? $this->route('tax_invoice')?->id;
        return [
            'code'                      => ['nullable', 'string', 'max:64', Rule::unique('tax_invoices', 'code')->ignore($tiId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'export_invoice_id'         => ['required', 'integer', 'exists:export_invoices,id'],
            'partner_id'                => ['required', 'integer', 'exists:partners,id'],
            'invoice_date'              => ['required', 'date'],
            'date_of_supply'            => ['nullable', 'date'],
            'reference'                 => ['nullable', 'string', 'max:128'],

            'currency'                  => ['required', 'string', 'max:8'],
            'exchange_rate'             => ['required', 'numeric', 'gt:0'],

            'transport_mode'            => ['nullable', 'string', 'in:air,sea,road,rail,multimodal,other'],
            'incoterm'                  => ['nullable', 'string', 'in:FOB,CIF,EXW,CFR,DAP,DDP'],
            'lut_no'                    => ['nullable', 'string', 'max:64'],
            'lut_date'                  => ['nullable', 'date'],
            'tax_details'               => ['nullable', 'string', 'max:255'],

            'customs_notification_no'   => ['nullable', 'string', 'max:64'],
            'customs_notification_date' => ['nullable', 'date'],

            'gstin_supplier'            => ['nullable', 'string', 'max:32'],
            'gstin_recipient'           => ['nullable', 'string', 'max:32'],
            'place_of_supply'           => ['nullable', 'string', 'max:64'],

            'consignee_partner_id'      => ['nullable', 'integer', 'exists:partners,id'],
            'consignee_name'            => ['nullable', 'string', 'max:255'],
            'consignee_address'         => ['nullable', 'string'],
            'consignee_country'         => ['nullable', 'string', 'size:2'],
            'consignee_contact_person'  => ['nullable', 'string', 'max:255'],
            'consignee_phone'           => ['nullable', 'string', 'max:64'],
            'consignee_email'           => ['nullable', 'email', 'max:255'],
            'consignee_registration_no' => ['nullable', 'string', 'max:64'],

            'notify_party_name'         => ['nullable', 'string', 'max:255'],
            'notify_party_address'      => ['nullable', 'string'],

            'port_of_loading'           => ['nullable', 'string', 'max:128'],
            'port_of_discharge'         => ['nullable', 'string', 'max:128'],
            'loading_destination'       => ['nullable', 'string', 'max:255'],
            'final_destination'         => ['nullable', 'string', 'max:255'],
            'payment_terms'             => ['nullable', 'string', 'max:255'],

            'tax_type'                  => ['nullable', 'string', 'in:cgst_sgst,igst,none'],
            'discount'                  => ['nullable', 'numeric', 'min:0'],
            'shipping'                  => ['nullable', 'numeric', 'min:0'],
            'freight_charge'            => ['nullable', 'numeric', 'min:0'],
            'packaging_charge'          => ['nullable', 'numeric', 'min:0'],
            'development_charge'        => ['nullable', 'numeric', 'min:0'],
            'terms_and_conditions'      => ['nullable', 'string'],
            'notes'                     => ['nullable', 'string'],

            'lines'                          => ['required', 'array', 'min:1'],
            'lines.*.export_invoice_item_id' => ['nullable', 'integer', 'exists:export_invoice_items,id'],
            'lines.*.product_id'             => ['required', 'integer', 'exists:products,id'],
            'lines.*.hsn_code'               => ['nullable', 'string', 'max:16'],
            'lines.*.qty'                    => ['required', 'numeric', 'gt:0'],
            'lines.*.shipper_qty'            => ['nullable', 'numeric', 'min:0'],
            'lines.*.shipper_unit'           => ['nullable', 'string', 'max:32'],
            'lines.*.rate'                   => ['required', 'numeric', 'min:0'],
            'lines.*.discount_pct'           => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.tax_rate'               => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.batch_no'               => ['nullable', 'string', 'max:64'],
            'lines.*.expiry_date'            => ['nullable', 'date'],
            'lines.*.notes'                  => ['nullable', 'string'],
        ];
    }
}
