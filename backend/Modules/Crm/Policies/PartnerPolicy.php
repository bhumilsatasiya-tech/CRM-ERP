<?php

namespace Modules\Crm\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Crm\Models\Partner;

class PartnerPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool { return $actor->can('partner.view'); }
    public function view(User $actor, Partner $p): bool { return $actor->can('partner.view'); }
    public function create(User $actor): bool { return $actor->can('partner.create'); }
    public function update(User $actor, Partner $p): bool { return $actor->can('partner.update'); }
    public function delete(User $actor, Partner $p): bool { return $actor->can('partner.delete'); }
    public function restore(User $actor, Partner $p): bool { return $actor->can('partner.update'); }
}
