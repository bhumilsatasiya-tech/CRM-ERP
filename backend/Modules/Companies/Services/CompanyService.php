<?php

namespace Modules\Companies\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Company;
use RuntimeException;

class CompanyService
{
    public function paginate(array $filters, ?User $actor = null): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        $search  = (string) ($filters['search'] ?? '');
        $type    = (string) ($filters['type'] ?? '');
        $active  = $filters['is_active'] ?? null;

        return Company::query()
            ->withCount(['branches', 'warehouses', 'users'])
            ->when($actor && ! $this->canSeeAll($actor), function (Builder $q) use ($actor) {
                $q->whereIn('id', $actor->companies()->pluck('companies.id'));
            })
            ->when($search !== '', function (Builder $q) use ($search) {
                $q->where(function (Builder $qq) use ($search) {
                    $qq->where('name', 'like', "%{$search}%")
                       ->orWhere('code', 'like', "%{$search}%")
                       ->orWhere('legal_name', 'like', "%{$search}%")
                       ->orWhere('gst_no', 'like', "%{$search}%");
                });
            })
            ->when($type !== '', fn(Builder $q) => $q->where('type', $type))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function create(array $data, ?int $actorId = null): Company
    {
        return DB::transaction(function () use ($data, $actorId) {
            return Company::create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'currency'   => $data['currency'] ?? 'INR',
                'country'    => $data['country'] ?? 'India',
            ]));
        });
    }

    public function update(Company $company, array $data, ?int $actorId = null): Company
    {
        return DB::transaction(function () use ($company, $data, $actorId) {
            $company->fill($data);
            $company->updated_by = $actorId;
            $company->save();
            return $company->fresh();
        });
    }

    /**
     * Soft-delete the company and cascade-soft-delete its branches + warehouses.
     * Audit history is preserved (rows stay in the DB with deleted_at set).
     * If the deleted company was someone's default, EnsureCompanyContext will auto-heal them.
     */
    public function delete(Company $company): void
    {
        DB::transaction(function () use ($company) {
            // Cascade soft-delete children. We use bulk update so the SoftDeletingScope
            // doesn't choke on already-deleted rows during a re-delete.
            $company->branches()->delete();
            $company->warehouses()->delete();
            $company->delete();
        });
    }

    public function attachUser(Company $company, User $user, bool $isDefault = false, ?string $position = null): void
    {
        $company->users()->syncWithoutDetaching([
            $user->id => ['is_default' => $isDefault, 'position' => $position],
        ]);
        if ($isDefault) {
            $user->forceFill(['default_company_id' => $company->id])->save();
        }
    }

    public function detachUser(Company $company, User $user): void
    {
        $company->users()->detach($user->id);
        if ($user->default_company_id === $company->id) {
            $next = $user->companies()->first();
            $user->forceFill(['default_company_id' => $next?->id])->save();
        }
    }

    private function canSeeAll(User $user): bool
    {
        $bypass = config('companies.all_companies_roles', ['super-admin']);
        return method_exists($user, 'hasAnyRole') && $user->hasAnyRole($bypass);
    }
}
