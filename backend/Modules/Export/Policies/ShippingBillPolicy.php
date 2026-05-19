<?php

namespace Modules\Export\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Export\Models\ShippingBill;

class ShippingBillPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('export.shipping.view'); }
    public function view(User $u, ShippingBill $s): bool { return $u->can('export.shipping.view'); }
    public function create(User $u): bool { return $u->can('export.shipping.create'); }
    public function update(User $u, ShippingBill $s): bool { return $u->can('export.shipping.update'); }
    public function delete(User $u, ShippingBill $s): bool { return $u->can('export.shipping.delete'); }
    public function dispatch(User $u, ShippingBill $s): bool { return $u->can('export.shipping.dispatch'); }
}
