<?php

namespace Modules\Quotation\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Quotation\Models\Quotation;

class QuotationPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('quotation.view'); }
    public function view(User $u, Quotation $q): bool { return $u->can('quotation.view'); }
    public function create(User $u): bool { return $u->can('quotation.create'); }
    public function update(User $u, Quotation $q): bool { return $u->can('quotation.update'); }
    public function delete(User $u, Quotation $q): bool { return $u->can('quotation.delete'); }
    public function approve(User $u, Quotation $q): bool { return $u->can('quotation.approve'); }
    public function convert(User $u, Quotation $q): bool { return $u->can('sales.order.create'); }
}
