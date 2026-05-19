<?php

namespace Modules\Export\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackingListRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('export.packing.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $plId = $this->route('packing_list')?->id;
        return [
            'code'                => ['nullable', 'string', 'max:64', Rule::unique('packing_lists', 'code')->ignore($plId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'export_invoice_id'   => ['required', 'integer', 'exists:export_invoices,id'],
            'partner_id'          => ['nullable', 'integer', 'exists:partners,id'],
            'pl_date'             => ['required', 'date'],
            'invoice_date'        => ['nullable', 'date'],
            'date_of_supply'      => ['nullable', 'date'],

            'transport_mode'      => ['nullable', 'string', 'in:air,sea,road,rail,multimodal,other'],
            'incoterm'            => ['nullable', 'string', 'in:FOB,CIF,EXW,CFR,DAP,DDP'],
            'lut_no'              => ['nullable', 'string', 'max:64'],
            'lut_date'            => ['nullable', 'date'],
            'tax_details'         => ['nullable', 'string', 'max:255'],
            'place_of_supply'     => ['nullable', 'string', 'max:64'],

            'consignee_partner_id'      => ['nullable', 'integer', 'exists:partners,id'],
            'consignee_name'            => ['nullable', 'string', 'max:255'],
            'consignee_address'         => ['nullable', 'string'],
            'consignee_country'         => ['nullable', 'string', 'size:2'],
            'consignee_contact_person'  => ['nullable', 'string', 'max:255'],
            'consignee_phone'           => ['nullable', 'string', 'max:64'],
            'consignee_email'           => ['nullable', 'email', 'max:255'],
            'consignee_registration_no' => ['nullable', 'string', 'max:64'],

            'notify_party_name'   => ['nullable', 'string', 'max:255'],
            'notify_party_address'=> ['nullable', 'string'],

            'port_of_loading'     => ['nullable', 'string', 'max:128'],
            'port_of_discharge'   => ['nullable', 'string', 'max:128'],
            'loading_destination' => ['nullable', 'string', 'max:255'],
            'final_destination'   => ['nullable', 'string', 'max:255'],

            'marks_and_numbers'   => ['nullable', 'string'],
            'total_pallet_qty'    => ['nullable', 'integer', 'min:0'],
            'volume_cbm'          => ['nullable', 'numeric', 'min:0'],
            'notes'               => ['nullable', 'string'],

            'lines'                          => ['required', 'array', 'min:1'],
            'lines.*.export_invoice_item_id' => ['nullable', 'integer', 'exists:export_invoice_items,id'],
            'lines.*.product_id'             => ['required', 'integer', 'exists:products,id'],
            'lines.*.hsn_code'               => ['nullable', 'string', 'max:16'],
            'lines.*.qty'                    => ['required', 'numeric', 'gt:0'],
            'lines.*.packages'               => ['nullable', 'integer', 'min:0'],
            'lines.*.shipper_unit'           => ['nullable', 'string', 'max:32'],
            'lines.*.marks'                  => ['nullable', 'string', 'max:191'],
            'lines.*.gross_weight_kg'        => ['nullable', 'numeric', 'min:0'],
            'lines.*.net_weight_kg'          => ['nullable', 'numeric', 'min:0'],
            'lines.*.dimensions'             => ['nullable', 'string', 'max:64'],
            'lines.*.batch_no'               => ['nullable', 'string', 'max:64'],
            'lines.*.notes'                  => ['nullable', 'string'],
        ];
    }
}
