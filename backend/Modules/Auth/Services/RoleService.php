<?php

namespace Modules\Auth\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 20);
        $perPage = max(1, min($perPage, 100));
        $search  = (string) ($filters['search'] ?? '');

        return Role::query()
            ->with(['permissions'])
            ->withCount('users')
            ->where('guard_name', 'api')
            ->when($search !== '', fn(Builder $q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data) {
            $role = Role::create([
                'name'        => $data['name'],
                'guard_name'  => 'api',
                'description' => $data['description'] ?? null,
                'is_system'   => false,
            ]);

            if (! empty($data['permissions'])) {
                $perms = Permission::where('guard_name', 'api')
                    ->whereIn('name', $data['permissions'])
                    ->get();
                $role->syncPermissions($perms);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
            return $role->load('permissions');
        });
    }

    public function update(Role $role, array $data): Role
    {
        if ($role->is_system && isset($data['name']) && $data['name'] !== $role->name) {
            throw new RuntimeException('System roles cannot be renamed.');
        }

        return DB::transaction(function () use ($role, $data) {
            $role->fill(array_filter([
                'name'        => $data['name'] ?? null,
                'description' => $data['description'] ?? null,
            ], fn($v) => !is_null($v)));
            $role->save();

            if (array_key_exists('permissions', $data) && is_array($data['permissions'])) {
                $perms = Permission::where('guard_name', 'api')
                    ->whereIn('name', $data['permissions'])
                    ->get();
                $role->syncPermissions($perms);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
            return $role->load('permissions');
        });
    }

    public function delete(Role $role): void
    {
        if ($role->is_system) {
            throw new RuntimeException('System roles cannot be deleted.');
        }
        if ($role->users()->exists()) {
            throw new RuntimeException('Cannot delete a role with assigned users. Reassign users first.');
        }
        DB::transaction(function () use ($role) {
            $role->delete();
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }
}
