<?php

namespace Modules\Projects\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Projects\Models\Project;

class ProjectPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('project.cost.view'); }
    public function view(User $u, Project $_): bool { return $u->can('project.cost.view'); }
    public function create(User $u): bool { return $u->can('project.cost.create'); }
    public function update(User $u, Project $_): bool { return $u->can('project.cost.update'); }
    public function delete(User $u, Project $_): bool { return $u->can('project.cost.delete'); }
    public function finalize(User $u, Project $_): bool { return $u->can('project.cost.finalize'); }
}
