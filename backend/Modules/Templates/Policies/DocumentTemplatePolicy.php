<?php

namespace Modules\Templates\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Templates\Models\DocumentTemplate;

class DocumentTemplatePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('template.view'); }
    public function view(User $u, DocumentTemplate $t): bool { return $u->can('template.view'); }
    public function create(User $u): bool { return $u->can('template.create'); }
    public function update(User $u, DocumentTemplate $t): bool { return $u->can('template.update'); }
    public function delete(User $u, DocumentTemplate $t): bool { return $u->can('template.delete'); }
}
