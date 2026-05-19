<?php

namespace Modules\Companies\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Warehouse;

class WarehousePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool
    {
        return $actor->can('warehouse.view');
    }

    public function view(User $actor, Warehouse $warehouse): bool
    {
        return $actor->can('warehouse.view');
    }

    public function create(User $actor): bool
    {
        return $actor->can('warehouse.create');
    }

    public function update(User $actor, Warehouse $warehouse): bool
    {
        return $actor->can('warehouse.update');
    }

    public function delete(User $actor, Warehouse $warehouse): bool
    {
        return $actor->can('warehouse.delete');
    }
}
