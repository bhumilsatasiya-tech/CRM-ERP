<?php

namespace Modules\Documents\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Documents\Models\Document;

class DocumentPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('document.view'); }
    public function view(User $u, Document $d): bool { return $u->can('document.view'); }
    public function create(User $u): bool { return $u->can('document.upload'); }
    public function delete(User $u, Document $d): bool { return $u->can('document.delete'); }
}
