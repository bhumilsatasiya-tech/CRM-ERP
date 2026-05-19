<?php

namespace Modules\ExportIncentives\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\ExportIncentives\Models\ExportIncentiveClaim;

class ExportIncentiveClaimPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('export.incentive.view'); }
    public function view(User $u, ExportIncentiveClaim $c): bool { return $u->can('export.incentive.view'); }
    public function create(User $u): bool { return $u->can('export.incentive.create'); }
    public function update(User $u, ExportIncentiveClaim $c): bool { return $u->can('export.incentive.update'); }
    public function delete(User $u, ExportIncentiveClaim $c): bool { return $u->can('export.incentive.delete'); }
}
