<?php

namespace Modules\Crm\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Crm\Models\Partner;

class PartnerService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        $search  = (string) ($filters['search'] ?? '');
        $type    = (string) ($filters['type'] ?? '');
        $segment = (string) ($filters['segment'] ?? '');
        $active  = $filters['is_active'] ?? null;
        $sort    = (string) ($filters['sort'] ?? '-created_at');

        return Partner::query()
            ->withCount(['contacts', 'addresses', 'bankAccounts'])
            ->when($search !== '', function (Builder $q) use ($search) {
                $q->where(function (Builder $qq) use ($search) {
                    $like = "%{$search}%";
                    $qq->where('name', 'like', $like)
                       ->orWhere('code', 'like', $like)
                       ->orWhere('legal_name', 'like', $like)
                       ->orWhere('email', 'like', $like)
                       ->orWhere('phone', 'like', $like)
                       ->orWhere('mobile', 'like', $like)
                       ->orWhere('gst_no', 'like', $like)
                       ->orWhere('pan_no', 'like', $like);
                });
            })
            ->when($type !== '',    fn(Builder $q) => $q->where('type', $type))
            ->when($segment !== '', fn(Builder $q) => $q->where('segment', $segment))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderByRaw($this->buildSort($sort))
            ->paginate($perPage);
    }

    public function create(array $data, ?int $actorId = null): Partner
    {
        return DB::transaction(function () use ($data, $actorId) {
            $p = Partner::create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
                'currency'   => $data['currency'] ?? 'INR',
            ]));
            self::flushLookupCache((int) $p->company_id);
            return $p;
        });
    }

    public function update(Partner $partner, array $data, ?int $actorId = null): Partner
    {
        return DB::transaction(function () use ($partner, $data, $actorId) {
            $partner->fill($data);
            $partner->updated_by = $actorId;
            $partner->save();
            self::flushLookupCache((int) $partner->company_id);
            return $partner->fresh();
        });
    }

    public function delete(Partner $partner): void
    {
        DB::transaction(function () use ($partner) {
            $partner->delete();
            self::flushLookupCache((int) $partner->company_id);
        });
    }

    public function lookup(array $filters): array
    {
        $term   = (string) ($filters['q'] ?? '');
        $type   = (string) ($filters['type'] ?? '');
        $limit  = max(1, min((int) ($filters['limit'] ?? 10), 50));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        // 'supplier' lookup also includes 'logistic' partners (logistic IS a kind of supplier).
        $typesIn = $type === 'supplier' ? ['supplier', 'logistic'] : null;

        // Cache lookup results for 60s — partner master data changes rarely; cache invalidates on create/update/delete.
        $companyId = app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
        $cacheKey = sprintf('lookup:partners:c%d:t%s:q%s:o%d:l%d', $companyId, $type, md5($term), $offset, $limit);

        return Cache::remember($cacheKey, 60, function () use ($term, $type, $typesIn, $limit, $offset) {
            return Partner::query()
                ->select(['id', 'company_id', 'code', 'name', 'type', 'country', 'tax_treatment', 'gst_no', 'email', 'phone'])
                ->active()
                ->when($typesIn !== null, fn(Builder $q) => $q->whereIn('type', $typesIn))
                ->when($typesIn === null && $type !== '', fn(Builder $q) => $q->where('type', $type))
                ->when($term !== '', function (Builder $q) use ($term) {
                    $like = "%{$term}%";
                    $q->where(function (Builder $qq) use ($like) {
                        $qq->where('name', 'like', $like)
                           ->orWhere('code', 'like', $like)
                           ->orWhere('phone', 'like', $like)
                           ->orWhere('mobile', 'like', $like)
                           ->orWhere('gst_no', 'like', $like);
                    });
                })
                ->orderBy('name')
                ->offset($offset)
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    /** Invalidate the entire partner-lookup cache for the active company. */
    public static function flushLookupCache(?int $companyId = null): void
    {
        $companyId ??= app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
        // The naive flush: clear the whole cache store. For Redis-backed envs, prefer tags.
        Cache::flush();
    }

    private function buildSort(string $sort): string
    {
        $allowed = ['name', 'code', 'type', 'created_at', 'is_active'];
        $direction = 'asc';
        $column = ltrim($sort, '-');
        if (str_starts_with($sort, '-')) $direction = 'desc';
        if (! in_array($column, $allowed, true)) { $column = 'created_at'; $direction = 'desc'; }
        return sprintf('%s %s', $column, $direction);
    }
}
