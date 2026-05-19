<?php

namespace Modules\Auth\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool
    {
        return $actor->can('user.view');
    }

    public function view(User $actor, User $target): bool
    {
        return $actor->id === $target->id || $actor->can('user.view');
    }

    public function create(User $actor): bool
    {
        return $actor->can('user.create');
    }

    public function update(User $actor, User $target): bool
    {
        if ($target->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            return false;
        }
        return $actor->can('user.update');
    }

    public function delete(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return false;
        }
        if ($target->isSuperAdmin()) {
            return false;
        }
        return $actor->can('user.delete');
    }

    public function restore(User $actor, User $target): bool
    {
        return $actor->can('user.restore');
    }
}
