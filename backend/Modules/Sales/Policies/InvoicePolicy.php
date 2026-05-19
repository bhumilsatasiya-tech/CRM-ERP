<?php

namespace Modules\Sales\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Sales\Models\Invoice;

class InvoicePolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('invoice.view'); }
    public function view(User $u, Invoice $i): bool { return $u->can('invoice.view'); }
    public function create(User $u): bool { return $u->can('invoice.create'); }
    public function update(User $u, Invoice $i): bool { return $u->can('invoice.update'); }
    public function delete(User $u, Invoice $i): bool { return $u->can('invoice.delete'); }
    public function post(User $u, Invoice $i): bool { return $u->can('invoice.post'); }
    public function pay(User $u, Invoice $i): bool { return $u->can('invoice.payment'); }
}
