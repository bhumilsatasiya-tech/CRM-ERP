<?php

namespace Modules\Crm\Services;

use Illuminate\Support\Facades\DB;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerContact;

class PartnerContactService
{
    public function listFor(Partner $partner): array
    {
        return $partner->contacts()->orderByDesc('is_primary')->orderBy('name')->get()->toArray();
    }

    public function create(Partner $partner, array $data, ?int $actorId = null): PartnerContact
    {
        return DB::transaction(function () use ($partner, $data, $actorId) {
            if (! empty($data['is_primary'])) {
                $partner->contacts()->update(['is_primary' => false]);
            }
            return $partner->contacts()->create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
            ]));
        });
    }

    public function update(PartnerContact $contact, array $data, ?int $actorId = null): PartnerContact
    {
        return DB::transaction(function () use ($contact, $data, $actorId) {
            if (! empty($data['is_primary']) && ! $contact->is_primary) {
                PartnerContact::where('partner_id', $contact->partner_id)
                    ->where('id', '!=', $contact->id)
                    ->update(['is_primary' => false]);
            }
            $contact->fill($data);
            $contact->updated_by = $actorId;
            $contact->save();
            return $contact->fresh();
        });
    }

    public function delete(PartnerContact $contact): void
    {
        DB::transaction(fn() => $contact->delete());
    }
}
