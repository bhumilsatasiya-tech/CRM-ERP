<?php

namespace Modules\Crm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PartnerBankAccountResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'             => $this->id,
            'partner_id'     => $this->partner_id,
            'bank_name'      => $this->bank_name,
            'branch'         => $this->branch,
            'account_holder' => $this->account_holder,
            'account_no'     => $this->account_no,
            'account_no_masked' => $this->account_no_masked,
            'account_type'   => $this->account_type,
            'ifsc'           => $this->ifsc,
            'swift'          => $this->swift,
            'iban'           => $this->iban,
            'currency'       => $this->currency,
            'bank_country'   => $this->bank_country,
            'bank_address'   => $this->bank_address,
            'is_primary'     => (bool) $this->is_primary,
            'is_active'      => (bool) $this->is_active,
            'notes'          => $this->notes,
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
