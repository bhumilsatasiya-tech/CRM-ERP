<?php

namespace Modules\Crm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PartnerResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                          => $this->id,
            'company_id'                  => $this->company_id,
            'code'                        => $this->code,
            'name'                        => $this->name,
            'legal_name'                  => $this->legal_name,
            'is_company'                  => (bool) $this->is_company,
            'type'                        => $this->type,

            'email'                       => $this->email,
            'phone'                       => $this->phone,
            'mobile'                      => $this->mobile,
            'website'                     => $this->website,
            'country'                     => $this->country,

            'gst_no'                      => $this->gst_no,
            'pan_no'                      => $this->pan_no,
            'vat_no'                      => $this->vat_no,
            'cin_no'                      => $this->cin_no,
            'tax_treatment'               => $this->tax_treatment,

            'industry'                    => $this->industry,
            'segment'                     => $this->segment,

            'currency'                    => $this->currency,
            'credit_limit'                => (float) $this->credit_limit,
            'credit_days'                 => (int) $this->credit_days,
            'opening_balance'             => (float) $this->opening_balance,
            'opening_balance_type'        => $this->opening_balance_type,
            'default_payment_terms_days'  => (int) $this->default_payment_terms_days,

            'default_warehouse_id'        => $this->default_warehouse_id,
            'default_billing_address_id'  => $this->default_billing_address_id,
            'default_shipping_address_id' => $this->default_shipping_address_id,
            'default_bank_account_id'     => $this->default_bank_account_id,

            'is_active'                   => (bool) $this->is_active,
            'is_blacklisted'              => (bool) $this->is_blacklisted,
            'blacklist_reason'            => $this->blacklist_reason,

            'notes'                       => $this->notes,
            'meta'                        => $this->meta,

            'contacts_count'              => $this->whenCounted('contacts'),
            'addresses_count'             => $this->whenCounted('addresses'),
            'bank_accounts_count'         => $this->whenCounted('bankAccounts'),

            'contacts'                    => PartnerContactResource::collection($this->whenLoaded('contacts')),
            'addresses'                   => PartnerAddressResource::collection($this->whenLoaded('addresses')),
            'bank_accounts'               => PartnerBankAccountResource::collection($this->whenLoaded('bankAccounts')),

            'created_at'                  => $this->created_at?->toIso8601String(),
            'updated_at'                  => $this->updated_at?->toIso8601String(),
        ];
    }
}
