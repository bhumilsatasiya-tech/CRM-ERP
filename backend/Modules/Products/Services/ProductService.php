<?php

namespace Modules\Products\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Products\Models\Product;

class ProductService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage   = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        $search    = (string) ($filters['search'] ?? '');
        $type      = (string) ($filters['type'] ?? '');
        $categoryId= $filters['category_id'] ?? null;
        $active    = $filters['is_active'] ?? null;
        $sort      = (string) ($filters['sort'] ?? '-created_at');

        return Product::query()
            ->with(['category:id,code,name', 'unit:id,code,symbol'])
            ->when($search !== '', function (Builder $q) use ($search) {
                $like = "%{$search}%";
                $q->where(function (Builder $qq) use ($like) {
                    $qq->where('code', 'like', $like)
                       ->orWhere('barcode', 'like', $like)
                       ->orWhere('name', 'like', $like)
                       ->orWhere('hsn_code', 'like', $like);
                });
            })
            ->when($type !== '', fn(Builder $q) => $q->where('type', $type))
            ->when($categoryId, fn(Builder $q) => $q->where('category_id', (int) $categoryId))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderByRaw($this->buildSort($sort))
            ->paginate($perPage);
    }

    public function create(array $data, ?int $actorId = null): Product
    {
        return DB::transaction(function () use ($data, $actorId) {
            $p = Product::create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'currency'   => $data['currency'] ?? 'INR',
            ]));
            self::flushLookupCache((int) $p->company_id);
            return $p;
        });
    }

    public function update(Product $product, array $data, ?int $actorId = null): Product
    {
        return DB::transaction(function () use ($product, $data, $actorId) {
            $product->fill($data);
            $product->updated_by = $actorId;
            $product->save();
            self::flushLookupCache((int) $product->company_id);
            return $product->fresh(['category', 'unit', 'uomConversions.unit']);
        });
    }

    public function delete(Product $product): void
    {
        DB::transaction(function () use ($product) {
            $product->delete();
            self::flushLookupCache((int) $product->company_id);
        });
    }

    public function lookup(array $filters): array
    {
        $term       = (string) ($filters['q'] ?? '');
        $type       = (string) ($filters['type'] ?? '');
        $categoryId = $filters['category_id'] ?? null;
        $limit      = max(1, min((int) ($filters['limit'] ?? 10), 50));
        $offset     = max(0, (int) ($filters['offset'] ?? 0));

        $companyId = app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
        $cacheKey  = sprintf('lookup:products:c%d:t%s:cat%s:q%s:o%d:l%d', $companyId, $type, (string) $categoryId, md5($term), $offset, $limit);

        return Cache::remember($cacheKey, 60, function () use ($type, $categoryId, $term, $limit, $offset) {
            return Product::query()
                ->with(['unit:id,code,symbol'])
                ->select(['id', 'company_id', 'code', 'name', 'type', 'unit_id', 'hsn_code', 'tax_rate', 'standard_price', 'standard_cost', 'currency'])
                ->active()
                ->when($type !== '',   fn(Builder $q) => $q->where('type', $type))
                ->when($categoryId,    fn(Builder $q) => $q->where('category_id', (int) $categoryId))
                ->when($term !== '', function (Builder $q) use ($term) {
                    $like = "%{$term}%";
                    $q->where(function (Builder $qq) use ($like) {
                        $qq->where('code', 'like', $like)
                           ->orWhere('name', 'like', $like)
                           ->orWhere('barcode', 'like', $like)
                           ->orWhere('hsn_code', 'like', $like);
                    });
                })
                ->orderBy('name')
                ->offset($offset)
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    public static function flushLookupCache(?int $companyId = null): void
    {
        Cache::flush();
    }

    private function buildSort(string $sort): string
    {
        $allowed = ['name', 'code', 'type', 'created_at', 'standard_price', 'standard_cost', 'is_active'];
        $direction = 'asc';
        $column = ltrim($sort, '-');
        if (str_starts_with($sort, '-')) $direction = 'desc';
        if (! in_array($column, $allowed, true)) { $column = 'created_at'; $direction = 'desc'; }
        return sprintf('%s %s', $column, $direction);
    }
}
