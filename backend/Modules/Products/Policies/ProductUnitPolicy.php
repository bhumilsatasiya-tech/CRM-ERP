<?php

namespace Modules\Products\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Products\Models\ProductUnit;

class ProductUnitPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('unit.view'); }
    public function view(User $u, ProductUnit $unit): bool { return $u->can('unit.view'); }
    public function create(User $u): bool { return $u->can('unit.create'); }
    public function update(User $u, ProductUnit $unit): bool { return $u->can('unit.update'); }
    public function delete(User $u, ProductUnit $unit): bool { return $u->can('unit.delete'); }
}
