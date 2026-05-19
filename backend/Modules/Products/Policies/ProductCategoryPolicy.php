<?php

namespace Modules\Products\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Products\Models\ProductCategory;

class ProductCategoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('category.view'); }
    public function view(User $u, ProductCategory $c): bool { return $u->can('category.view'); }
    public function create(User $u): bool { return $u->can('category.create'); }
    public function update(User $u, ProductCategory $c): bool { return $u->can('category.update'); }
    public function delete(User $u, ProductCategory $c): bool { return $u->can('category.delete'); }
}
