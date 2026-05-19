<?php

namespace Modules\Crm\Services;

use Illuminate\Support\Facades\DB;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerBankAccount;

class PartnerBankAccountService
{
    public function listFor(Partner $partner): array
    {
        return $partner->bankAccounts()
            ->orderByDesc('is_primary')
            ->orderBy('bank_name')
            ->get()
            ->toArray();
    }

    public function create(Partner $partner, array $data, ?int $actorId = null): PartnerBankAccount
    {
        return DB::transaction(function () use ($partner, $data, $actorId) {
            if (! empty($data['is_primary'])) {
                $partner->bankAccounts()->update(['is_primary' => false]);
            }
            $bank = $partner->bankAccounts()->create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'currency'   => $data['currency'] ?? 'INR',
            ]));

            if ($bank->is_primary && $partner->default_bank_account_id !== $bank->id) {
                $partner->forceFill(['default_bank_account_id' => $bank->id])->save();
            }
            return $bank;
        });
    }

    public function update(PartnerBankAccount $bank, array $data, ?int $actorId = null): PartnerBankAccount
    {
        return DB::transaction(function () use ($bank, $data, $actorId) {
            if (! empty($data['is_primary']) && ! $bank->is_primary) {
                PartnerBankAccount::where('partner_id', $bank->partner_id)
                    ->where('id', '!=', $bank->id)
                    ->update(['is_primary' => false]);
            }
            $bank->fill($data);
            $bank->updated_by = $actorId;
            $bank->save();

            if ($bank->is_primary && $bank->partner && $bank->partner->default_bank_account_id !== $bank->id) {
                $bank->partner->forceFill(['default_bank_account_id' => $bank->id])->save();
            }
            return $bank->fresh();
        });
    }

    public function delete(PartnerBankAccount $bank): void
    {
        DB::transaction(function () use ($bank) {
            $partner = $bank->partner;
            if ($partner?->default_bank_account_id === $bank->id) {
                $partner->forceFill(['default_bank_account_id' => null])->save();
            }
            $bank->delete();
        });
    }
}
