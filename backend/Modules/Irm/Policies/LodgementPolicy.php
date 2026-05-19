<?php

namespace Modules\Irm\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Irm\Models\Lodgement;

class LodgementPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('lodgement.view'); }
    public function view(User $u, Lodgement $l): bool { return $u->can('lodgement.view'); }
    public function create(User $u): bool { return $u->can('lodgement.create'); }
    public function update(User $u, Lodgement $l): bool { return $u->can('lodgement.update'); }
    public function delete(User $u, Lodgement $l): bool { return $u->can('lodgement.delete'); }
    public function submit(User $u, Lodgement $l): bool { return $u->can('lodgement.submit') || $u->can('lodgement.update'); }
}
