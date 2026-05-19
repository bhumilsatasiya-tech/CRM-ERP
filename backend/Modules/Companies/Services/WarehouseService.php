<?php

namespace Modules\Companies\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Companies\Models\Company;
use Modules\Companies\Models\Warehouse;

class WarehouseService
{
    public function paginate(Company $company, array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 50), 200));
        $search  = (string) ($filters['search'] ?? '');
        $type    = (string) ($filters['type'] ?? '');
        $active  = $filters['is_active'] ?? null;

        return Warehouse::query()
            ->with('branch:id,code,name')
            ->where('company_id', $company->id)
            ->when($search !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($type !== '', fn(Builder $q) => $q->where('type', $type))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function create(Company $company, array $data, ?int $actorId = null): Warehouse
    {
        return DB::transaction(function () use ($company, $data, $actorId) {
            if (! empty($data['is_default'])) {
                Warehouse::where('company_id', $company->id)->update(['is_default' => false]);
            }
            return Warehouse::create(array_merge($data, [
                'company_id' => $company->id,
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'country'    => $data['country'] ?? 'India',
            ]));
        });
    }

    public function update(Warehouse $warehouse, array $data, ?int $actorId = null): Warehouse
    {
        return DB::transaction(function () use ($warehouse, $data, $actorId) {
            if (! empty($data['is_default']) && ! $warehouse->is_default) {
                Warehouse::where('company_id', $warehouse->company_id)
                    ->where('id', '!=', $warehouse->id)
                    ->update(['is_default' => false]);
            }
            $warehouse->fill($data);
            $warehouse->updated_by = $actorId;
            $warehouse->save();
            return $warehouse->fresh('branch');
        });
    }

    public function delete(Warehouse $warehouse): void
    {
        DB::transaction(fn() => $warehouse->delete());
    }
}
