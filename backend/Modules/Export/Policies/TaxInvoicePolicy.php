<?php

namespace Modules\Export\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Export\Models\TaxInvoice;

class TaxInvoicePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('export.taxinvoice.view'); }
    public function view(User $u, TaxInvoice $i): bool { return $u->can('export.taxinvoice.view'); }
    public function create(User $u): bool { return $u->can('export.taxinvoice.create'); }
    public function update(User $u, TaxInvoice $i): bool { return $u->can('export.taxinvoice.update'); }
    public function delete(User $u, TaxInvoice $i): bool { return $u->can('export.taxinvoice.delete'); }
    public function post(User $u, TaxInvoice $i): bool { return $u->can('export.taxinvoice.post'); }
}
