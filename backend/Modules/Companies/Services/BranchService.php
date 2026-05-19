<?php

namespace Modules\Companies\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Companies\Models\Branch;
use Modules\Companies\Models\Company;
use RuntimeException;

class BranchService
{
    public function paginate(Company $company, array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 50), 200));
        $search  = (string) ($filters['search'] ?? '');
        $active  = $filters['is_active'] ?? null;

        return Branch::query()
            ->where('company_id', $company->id)
            ->withCount('warehouses')
            ->when($search !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            }))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function create(Company $company, array $data, ?int $actorId = null): Branch
    {
        return DB::transaction(function () use ($company, $data, $actorId) {
            if (! empty($data['is_head_office'])) {
                Branch::where('company_id', $company->id)->update(['is_head_office' => false]);
            }
            return Branch::create(array_merge($data, [
                'company_id' => $company->id,
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'country'    => $data['country'] ?? 'India',
            ]));
        });
    }

    public function update(Branch $branch, array $data, ?int $actorId = null): Branch
    {
        return DB::transaction(function () use ($branch, $data, $actorId) {
            if (! empty($data['is_head_office']) && ! $branch->is_head_office) {
                Branch::where('company_id', $branch->company_id)
                    ->where('id', '!=', $branch->id)
                    ->update(['is_head_office' => false]);
            }
            $branch->fill($data);
            $branch->updated_by = $actorId;
            $branch->save();
            return $branch->fresh();
        });
    }

    /** Soft-delete the branch and cascade-soft-delete its warehouses (audit history preserved). */
    public function delete(Branch $branch): void
    {
        DB::transaction(function () use ($branch) {
            $branch->warehouses()->delete();
            $branch->delete();
        });
    }
}
