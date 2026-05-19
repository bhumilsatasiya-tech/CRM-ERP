<?php

namespace Modules\Companies\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Branch;

class BranchPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool
    {
        return $actor->can('branch.view');
    }

    public function view(User $actor, Branch $branch): bool
    {
        return $actor->can('branch.view');
    }

    public function create(User $actor): bool
    {
        return $actor->can('branch.create');
    }

    public function update(User $actor, Branch $branch): bool
    {
        return $actor->can('branch.update');
    }

    public function delete(User $actor, Branch $branch): bool
    {
        return $actor->can('branch.delete');
    }
}
