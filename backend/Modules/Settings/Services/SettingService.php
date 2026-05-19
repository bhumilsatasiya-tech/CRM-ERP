<?php

namespace Modules\Settings\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Settings\Models\Setting;

/**
 * Resolves settings with scope precedence: user > company > global.
 * Caches each resolved key for performance; cache cleared on write.
 */
class SettingService
{
    private function cacheKey(string $scope, ?int $scopeId, string $key): string
    {
        return "setting:{$scope}:" . ($scopeId ?? '0') . ":{$key}";
    }

    /** Resolve a value with scope precedence: user → company → global. */
    public function get(string $key, mixed $default = null, ?int $userId = null, ?int $companyId = null): mixed
    {
        if ($userId) {
            $u = $this->raw('user', $userId, $key);
            if ($u !== null) return $u;
        }
        if ($companyId) {
            $c = $this->raw('company', $companyId, $key);
            if ($c !== null) return $c;
        }
        $g = $this->raw('global', null, $key);
        return $g ?? $default;
    }

    public function set(string $scope, ?int $scopeId, string $key, mixed $value, ?int $actorId = null): Setting
    {
        return DB::transaction(function () use ($scope, $scopeId, $key, $value, $actorId) {
            $row = Setting::where('scope', $scope)
                ->where('scope_id', $scopeId)
                ->where('key', $key)
                ->first();

            if ($row) {
                $row->value      = $value;
                $row->updated_by = $actorId;
                $row->save();
            } else {
                $row = Setting::create([
                    'scope'      => $scope,
                    'scope_id'   => $scopeId,
                    'group'      => 'general',
                    'key'        => $key,
                    'value'      => $value,
                    'type'       => $this->inferType($value),
                    'created_by' => $actorId,
                    'updated_by' => $actorId,
                ]);
            }

            Cache::forget($this->cacheKey($scope, $scopeId, $key));
            return $row;
        });
    }

    public function delete(Setting $setting): void
    {
        if ($setting->is_system) {
            throw new \RuntimeException('System settings cannot be deleted.');
        }
        DB::transaction(function () use ($setting) {
            Cache::forget($this->cacheKey($setting->scope, $setting->scope_id, $setting->key));
            $setting->delete();
        });
    }

    private function raw(string $scope, ?int $scopeId, string $key): mixed
    {
        $ttl = (int) config('settings.cache_ttl', 3600);
        $cacheKey = $this->cacheKey($scope, $scopeId, $key);

        return Cache::remember($cacheKey, $ttl, function () use ($scope, $scopeId, $key) {
            $row = Setting::where('scope', $scope)
                ->where('scope_id', $scopeId)
                ->where('key', $key)
                ->first();
            return $row?->value;
        });
    }

    private function inferType(mixed $value): string
    {
        if (is_bool($value))   return 'bool';
        if (is_int($value))    return 'int';
        if (is_array($value))  return 'json';
        return 'string';
    }
}
