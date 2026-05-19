<?php

namespace Modules\Purchase\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Purchase\Models\PurchaseInvoice;

class PurchaseInvoicePolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('purchase.invoice.view'); }
    public function view(User $u, PurchaseInvoice $p): bool { return $u->can('purchase.invoice.view'); }
    public function create(User $u): bool { return $u->can('purchase.invoice.create'); }
    public function update(User $u, PurchaseInvoice $p): bool { return $u->can('purchase.invoice.update'); }
    public function delete(User $u, PurchaseInvoice $p): bool { return $u->can('purchase.invoice.delete'); }
    public function post(User $u, PurchaseInvoice $p): bool { return $u->can('purchase.invoice.post'); }
}
