<?php

namespace Modules\Export\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PackingListResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'export_invoice_id' => $this->export_invoice_id,
            'export_invoice' => $this->whenLoaded('exportInvoice', fn() => $this->exportInvoice ? [
                'id' => $this->exportInvoice->id, 'code' => $this->exportInvoice->code,
                'currency' => $this->exportInvoice->currency,
                'total' => (float) $this->exportInvoice->total,
            ] : null),

            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),

            'pl_date'        => $this->pl_date?->toDateString(),
            'invoice_date'   => $this->invoice_date?->toDateString(),
            'date_of_supply' => $this->date_of_supply?->toDateString(),

            'transport_mode' => $this->transport_mode,
            'incoterm'       => $this->incoterm,
            'lut_no'         => $this->lut_no,
            'lut_date'       => $this->lut_date?->toDateString(),
            'tax_details'    => $this->tax_details,
            'place_of_supply'=> $this->place_of_supply,

            'consignee_partner_id'      => $this->consignee_partner_id,
            'consignee' => $this->whenLoaded('consignee', fn() => $this->consignee ? [
                'id' => $this->consignee->id, 'code' => $this->consignee->code, 'name' => $this->consignee->name,
            ] : null),
            'consignee_name'            => $this->consignee_name,
            'consignee_address'         => $this->consignee_address,
            'consignee_country'         => $this->consignee_country,
            'consignee_contact_person'  => $this->consignee_contact_person,
            'consignee_phone'           => $this->consignee_phone,
            'consignee_email'           => $this->consignee_email,
            'consignee_registration_no' => $this->consignee_registration_no,

            'notify_party_name'    => $this->notify_party_name,
            'notify_party_address' => $this->notify_party_address,

            'port_of_loading'     => $this->port_of_loading,
            'port_of_discharge'   => $this->port_of_discharge,
            'loading_destination' => $this->loading_destination,
            'final_destination'   => $this->final_destination,

            'marks_and_numbers' => $this->marks_and_numbers,
            'total_packages'    => (int) $this->total_packages,
            'total_pallet_qty'  => (int) $this->total_pallet_qty,
            'gross_weight_kg'   => (float) $this->gross_weight_kg,
            'net_weight_kg'     => (float) $this->net_weight_kg,
            'volume_cbm'        => (float) $this->volume_cbm,

            'status' => $this->status,
            'finalized_at' => $this->finalized_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,

            'lines' => $this->whenLoaded('items', fn() => $this->items->map(fn($l) => [
                'id' => $l->id,
                'export_invoice_item_id' => $l->export_invoice_item_id,
                'product_id' => $l->product_id,
                'hsn_code' => $l->hsn_code,
                'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty' => (float) $l->qty,
                'packages' => (int) $l->packages,
                'shipper_unit' => $l->shipper_unit,
                'marks' => $l->marks,
                'gross_weight_kg' => (float) $l->gross_weight_kg,
                'net_weight_kg'   => (float) $l->net_weight_kg,
                'dimensions' => $l->dimensions,
                'batch_no' => $l->batch_no,
                'notes' => $l->notes,
            ])->values()),
            'lines_count' => $this->whenCounted('items'),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
