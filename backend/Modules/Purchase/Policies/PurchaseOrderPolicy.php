<?php

namespace Modules\Purchase\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Purchase\Models\PurchaseOrder;

class PurchaseOrderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('purchase.order.view'); }
    public function view(User $u, PurchaseOrder $p): bool { return $u->can('purchase.order.view'); }
    public function create(User $u): bool { return $u->can('purchase.order.create'); }
    public function update(User $u, PurchaseOrder $p): bool { return $u->can('purchase.order.update'); }
    public function delete(User $u, PurchaseOrder $p): bool { return $u->can('purchase.order.delete'); }
    public function approve(User $u, PurchaseOrder $p): bool { return $u->can('purchase.order.approve'); }
}
