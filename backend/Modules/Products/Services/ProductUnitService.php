<?php

namespace Modules\Products\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Modules\Products\Models\ProductUnit;
use RuntimeException;

class ProductUnitService
{
    public function list(array $filters): \Illuminate\Database\Eloquent\Collection
    {
        $type = (string) ($filters['type'] ?? '');
        $search = (string) ($filters['search'] ?? '');

        return ProductUnit::query()
            ->when($type !== '', fn(Builder $q) => $q->where('type', $type))
            ->when($search !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($search) {
                $like = "%{$search}%";
                $qq->where('code', 'like', $like)->orWhere('name', 'like', $like)->orWhere('symbol', 'like', $like);
            }))
            ->orderBy('type')->orderByDesc('is_base')->orderBy('code')
            ->get();
    }

    /** Lazy-load lookup for SmartDropdown (typeahead + scroll-to-load). */
    public function lookup(array $filters): array
    {
        $term   = (string) ($filters['q'] ?? '');
        $type   = (string) ($filters['type'] ?? '');
        $limit  = max(1, min((int) ($filters['limit'] ?? 10), 50));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        return ProductUnit::query()
            ->select(['id', 'company_id', 'code', 'name', 'symbol', 'formal_name', 'uqc', 'type', 'decimals_allowed', 'is_base', 'conversion_factor'])
            ->where('is_active', true)
            ->when($type !== '', fn(Builder $q) => $q->where('type', $type))
            ->when($term !== '', function (Builder $q) use ($term) {
                $like = "%{$term}%";
                $q->where(function (Builder $qq) use ($like) {
                    $qq->where('code', 'like', $like)
                       ->orWhere('name', 'like', $like)
                       ->orWhere('symbol', 'like', $like)
                       ->orWhere('formal_name', 'like', $like)
                       ->orWhere('uqc', 'like', $like);
                });
            })
            ->orderBy('symbol')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function create(array $data, ?int $actorId = null): ProductUnit
    {
        return DB::transaction(function () use ($data, $actorId) {
            // Only one base unit per type per company
            if (! empty($data['is_base'])) {
                ProductUnit::query()
                    ->where('company_id', $data['company_id'] ?? app('active_company_id'))
                    ->where('type', $data['type'])
                    ->update(['is_base' => false]);
            }
            return ProductUnit::create(array_merge($data, [
                'created_by'        => $actorId,
                'updated_by'        => $actorId,
                'is_active'         => $data['is_active'] ?? true,
                'conversion_factor' => $data['conversion_factor'] ?? 1,
            ]));
        });
    }

    public function update(ProductUnit $unit, array $data, ?int $actorId = null): ProductUnit
    {
        return DB::transaction(function () use ($unit, $data, $actorId) {
            if (! empty($data['is_base']) && ! $unit->is_base) {
                ProductUnit::query()
                    ->where('company_id', $unit->company_id)
                    ->where('type', $data['type'] ?? $unit->type)
                    ->where('id', '!=', $unit->id)
                    ->update(['is_base' => false]);
            }
            $unit->fill($data);
            $unit->updated_by = $actorId;
            $unit->save();
            return $unit->fresh();
        });
    }

    public function delete(ProductUnit $unit): void
    {
        if ($unit->derivedUnits()->exists()) {
            throw new RuntimeException('Cannot delete a base unit that has derived units. Delete derived units first.');
        }
        DB::transaction(fn() => $unit->delete());
    }
}
