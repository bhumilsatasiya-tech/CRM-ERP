<?php

namespace Modules\Purchase\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Purchase\Models\Grn;

class GrnPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('purchase.grn.view'); }
    public function view(User $u, Grn $g): bool { return $u->can('purchase.grn.view'); }
    public function create(User $u): bool { return $u->can('purchase.grn.create'); }
    public function update(User $u, Grn $g): bool { return $u->can('purchase.grn.update'); }
    public function delete(User $u, Grn $g): bool { return $u->can('purchase.grn.delete'); }
    public function receive(User $u, Grn $g): bool { return $u->can('purchase.grn.update'); }
}
