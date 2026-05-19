<?php

namespace Modules\Tasks\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Tasks\Models\Task;

class TaskPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('task.view'); }
    public function view(User $u, Task $t): bool { return $u->can('task.view'); }
    public function create(User $u): bool { return $u->can('task.create'); }
    public function update(User $u, Task $t): bool { return $u->can('task.update'); }
    public function delete(User $u, Task $t): bool { return $u->can('task.delete'); }
    public function assign(User $u, Task $t): bool { return $u->can('task.assign'); }
}
