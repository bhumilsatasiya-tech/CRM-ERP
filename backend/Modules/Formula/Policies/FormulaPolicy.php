<?php

namespace Modules\Formula\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Formula\Models\Formula;

class FormulaPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('formula.view'); }
    public function view(User $u, Formula $f): bool { return $u->can('formula.view'); }
    public function create(User $u): bool { return $u->can('formula.create'); }
    public function update(User $u, Formula $f): bool { return $u->can('formula.update'); }
    public function delete(User $u, Formula $f): bool { return $u->can('formula.delete'); }
    public function activate(User $u, Formula $f): bool { return $u->can('formula.activate'); }
}
