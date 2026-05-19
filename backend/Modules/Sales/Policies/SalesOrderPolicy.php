<?php

namespace Modules\Sales\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Sales\Models\SalesOrder;

class SalesOrderPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('sales.order.view'); }
    public function view(User $u, SalesOrder $s): bool { return $u->can('sales.order.view'); }
    public function create(User $u): bool { return $u->can('sales.order.create'); }
    public function update(User $u, SalesOrder $s): bool { return $u->can('sales.order.update'); }
    public function delete(User $u, SalesOrder $s): bool { return $u->can('sales.order.delete'); }
    public function approve(User $u, SalesOrder $s): bool { return $u->can('sales.order.approve'); }
}
