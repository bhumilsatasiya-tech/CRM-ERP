<?php

namespace Modules\Auth\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool
    {
        return $actor->can('role.view');
    }

    public function view(User $actor, Role $role): bool
    {
        return $actor->can('role.view');
    }

    public function create(User $actor): bool
    {
        return $actor->can('role.create');
    }

    public function update(User $actor, Role $role): bool
    {
        return $actor->can('role.update');
    }

    public function delete(User $actor, Role $role): bool
    {
        if (! empty($role->is_system)) {
            return false;
        }
        return $actor->can('role.delete');
    }
}
