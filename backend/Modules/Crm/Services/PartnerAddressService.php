<?php

namespace Modules\Crm\Services;

use Illuminate\Support\Facades\DB;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerAddress;

class PartnerAddressService
{
    public function listFor(Partner $partner): array
    {
        return $partner->addresses()
            ->orderBy('type')
            ->orderByDesc('is_primary')
            ->get()
            ->toArray();
    }

    public function create(Partner $partner, array $data, ?int $actorId = null): PartnerAddress
    {
        return DB::transaction(function () use ($partner, $data, $actorId) {
            if (! empty($data['is_primary'])) {
                // only one primary address per (partner, type)
                $partner->addresses()
                    ->where('type', $data['type'])
                    ->update(['is_primary' => false]);
            }
            $addr = $partner->addresses()->create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'country'    => $data['country'] ?? 'India',
            ]));

            $this->syncPartnerDefaults($partner, $addr);
            return $addr;
        });
    }

    public function update(PartnerAddress $address, array $data, ?int $actorId = null): PartnerAddress
    {
        return DB::transaction(function () use ($address, $data, $actorId) {
            if (! empty($data['is_primary']) && ! $address->is_primary) {
                PartnerAddress::where('partner_id', $address->partner_id)
                    ->where('type', $data['type'] ?? $address->type)
                    ->where('id', '!=', $address->id)
                    ->update(['is_primary' => false]);
            }
            $address->fill($data);
            $address->updated_by = $actorId;
            $address->save();

            $this->syncPartnerDefaults($address->partner, $address);
            return $address->fresh();
        });
    }

    public function delete(PartnerAddress $address): void
    {
        DB::transaction(function () use ($address) {
            // Clear partner defaults that pointed to this address
            $partner = $address->partner;
            if ($partner?->default_billing_address_id === $address->id) {
                $partner->forceFill(['default_billing_address_id' => null])->save();
            }
            if ($partner?->default_shipping_address_id === $address->id) {
                $partner->forceFill(['default_shipping_address_id' => null])->save();
            }
            $address->delete();
        });
    }

    private function syncPartnerDefaults(Partner $partner, PartnerAddress $address): void
    {
        if (! $address->is_primary) return;
        $dirty = [];
        if ($address->type === 'billing'  && $partner->default_billing_address_id !== $address->id)  $dirty['default_billing_address_id'] = $address->id;
        if ($address->type === 'shipping' && $partner->default_shipping_address_id !== $address->id) $dirty['default_shipping_address_id'] = $address->id;
        if ($dirty) {
            $partner->forceFill($dirty)->save();
        }
    }
}
