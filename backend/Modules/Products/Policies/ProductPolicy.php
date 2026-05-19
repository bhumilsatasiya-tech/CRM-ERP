<?php

namespace Modules\Products\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Products\Models\Product;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('product.view'); }
    public function view(User $u, Product $p): bool { return $u->can('product.view'); }
    public function create(User $u): bool { return $u->can('product.create'); }
    public function update(User $u, Product $p): bool { return $u->can('product.update'); }
    public function delete(User $u, Product $p): bool { return $u->can('product.delete'); }
}
