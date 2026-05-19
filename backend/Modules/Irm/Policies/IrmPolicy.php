<?php

namespace Modules\Irm\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Irm\Models\Irm;

class IrmPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('irm.view'); }
    public function view(User $u, Irm $i): bool { return $u->can('irm.view'); }
    public function create(User $u): bool { return $u->can('irm.create'); }
    public function update(User $u, Irm $i): bool { return $u->can('irm.update'); }
    public function delete(User $u, Irm $i): bool { return $u->can('irm.delete'); }
    public function close(User $u, Irm $i): bool { return $u->can('irm.close'); }
}
