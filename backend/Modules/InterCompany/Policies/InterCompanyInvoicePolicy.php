<?php

namespace Modules\InterCompany\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\InterCompany\Models\InterCompanyInvoice;

class InterCompanyInvoicePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('intercompany.view'); }
    public function view(User $u, InterCompanyInvoice $i): bool { return $u->can('intercompany.view'); }
    public function create(User $u): bool { return $u->can('intercompany.create'); }
    public function update(User $u, InterCompanyInvoice $i): bool { return $u->can('intercompany.update'); }
    public function delete(User $u, InterCompanyInvoice $i): bool { return $u->can('intercompany.delete'); }
    public function post(User $u, InterCompanyInvoice $i): bool { return $u->can('intercompany.post'); }
    public function cancel(User $u, InterCompanyInvoice $i): bool { return $u->can('intercompany.cancel'); }
}
