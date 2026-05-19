<?php

namespace Modules\Export\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Export\Models\ExportInvoice;

class ExportInvoicePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('export.invoice.view'); }
    public function view(User $u, ExportInvoice $i): bool { return $u->can('export.invoice.view'); }
    public function create(User $u): bool { return $u->can('export.invoice.create'); }
    public function update(User $u, ExportInvoice $i): bool { return $u->can('export.invoice.update'); }
    public function delete(User $u, ExportInvoice $i): bool { return $u->can('export.invoice.delete'); }
    public function post(User $u, ExportInvoice $i): bool { return $u->can('export.invoice.post'); }
}
