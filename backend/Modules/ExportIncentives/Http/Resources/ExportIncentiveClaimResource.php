<?php

namespace Modules\ExportIncentives\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExportIncentiveClaimResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'type'              => $this->type,
            'shipping_bill_id'  => $this->shipping_bill_id,
            'shipping_bill'     => $this->whenLoaded('shippingBill', fn() => $this->shippingBill ? ['id' => $this->shippingBill->id, 'code' => $this->shippingBill->code] : null),
            'export_invoice_id' => $this->export_invoice_id,
            'export_invoice'    => $this->whenLoaded('exportInvoice', fn() => $this->exportInvoice ? ['id' => $this->exportInvoice->id, 'code' => $this->exportInvoice->code] : null),
            'claim_no'          => $this->claim_no,
            'claim_date'        => $this->claim_date?->toDateString(),
            'claim_amount'      => (float) $this->claim_amount,
            'claim_currency'    => $this->claim_currency,
            'status'            => $this->status,
            'credited_amount'   => $this->credited_amount !== null ? (float) $this->credited_amount : null,
            'credited_date'     => $this->credited_date?->toDateString(),
            'bank_ref'          => $this->bank_ref,
            'rejection_reason'  => $this->rejection_reason,
            'notes'             => $this->notes,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
