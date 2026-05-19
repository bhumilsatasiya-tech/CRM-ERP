<?php

namespace Modules\Auth\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Auth\Models\User;

class UserService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage  = (int) ($filters['per_page'] ?? 20);
        $perPage  = max(1, min($perPage, 100));
        $search   = (string) ($filters['search'] ?? '');
        $role     = (string) ($filters['role'] ?? '');
        $active   = $filters['is_active'] ?? null;
        $sort     = (string) ($filters['sort'] ?? '-created_at');

        return User::query()
            ->with(['roles'])
            ->when($search !== '', function (Builder $q) use ($search) {
                $q->where(function (Builder $qq) use ($search) {
                    $qq->where('name', 'like', "%{$search}%")
                       ->orWhere('email', 'like', "%{$search}%")
                       ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($role !== '', fn(Builder $q) => $q->whereHas('roles', fn(Builder $r) => $r->where('name', $role)))
            ->when(!is_null($active), fn(Builder $q) => $q->where('is_active', (bool) $active))
            ->orderByRaw($this->buildSort($sort))
            ->paginate($perPage);
    }

    public function create(array $data, ?int $actorId = null): User
    {
        return DB::transaction(function () use ($data, $actorId) {
            $user = new User();
            $user->fill([
                'name'                 => $data['name'],
                'email'                => $data['email'],
                'phone'                => $data['phone'] ?? null,
                'is_active'            => (bool) ($data['is_active'] ?? true),
                'default_company_id'   => $data['default_company_id'] ?? null,
                'locale'               => $data['locale'] ?? 'en',
                'timezone'             => $data['timezone'] ?? 'Asia/Kolkata',
                'must_change_password' => (bool) ($data['must_change_password'] ?? true),
                'created_by'           => $actorId,
                'updated_by'           => $actorId,
            ]);
            $user->password = Hash::make($data['password']);
            $user->password_changed_at = now();
            $user->save();

            if (! empty($data['roles'])) {
                $user->syncRoles($data['roles']);
            }
            return $user->load('roles');
        });
    }

    public function update(User $user, array $data, ?int $actorId = null): User
    {
        return DB::transaction(function () use ($user, $data, $actorId) {
            $user->fill(array_filter([
                'name'                 => $data['name'] ?? $user->name,
                'email'                => $data['email'] ?? $user->email,
                'phone'                => array_key_exists('phone', $data) ? $data['phone'] : $user->phone,
                'is_active'            => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $user->is_active,
                'default_company_id'   => array_key_exists('default_company_id', $data) ? $data['default_company_id'] : $user->default_company_id,
                'locale'               => $data['locale'] ?? $user->locale,
                'timezone'             => $data['timezone'] ?? $user->timezone,
                'must_change_password' => array_key_exists('must_change_password', $data) ? (bool) $data['must_change_password'] : $user->must_change_password,
                'updated_by'           => $actorId,
            ], fn($v) => !is_null($v)));
            $user->save();

            if (array_key_exists('roles', $data) && is_array($data['roles'])) {
                $user->syncRoles($data['roles']);
            }
            return $user->load('roles');
        });
    }

    public function delete(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });
    }

    public function adminResetPassword(User $user, string $newPassword, bool $mustChange = true): void
    {
        DB::transaction(function () use ($user, $newPassword, $mustChange) {
            $user->forceFill([
                'password'              => Hash::make($newPassword),
                'password_changed_at'   => now(),
                'must_change_password'  => $mustChange,
                'failed_login_attempts' => 0,
                'locked_until'          => null,
            ])->save();
            $user->tokens()->delete();
        });
    }

    private function buildSort(string $sort): string
    {
        $allowed = ['name', 'email', 'created_at', 'last_login_at', 'is_active'];
        $direction = 'asc';
        $column = ltrim($sort, '-');
        if (str_starts_with($sort, '-')) $direction = 'desc';
        if (! in_array($column, $allowed, true)) {
            $column = 'created_at'; $direction = 'desc';
        }
        return sprintf('%s %s', $column, $direction);
    }
}
