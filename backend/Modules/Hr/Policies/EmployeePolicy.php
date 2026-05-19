<?php

namespace Modules\Hr\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Hr\Models\Employee;

class EmployeePolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('hr.employee.view'); }
    public function view(User $u, Employee $e): bool { return $u->can('hr.employee.view'); }
    public function create(User $u): bool { return $u->can('hr.employee.create'); }
    public function update(User $u, Employee $e): bool { return $u->can('hr.employee.update'); }
    public function delete(User $u, Employee $e): bool { return $u->can('hr.employee.delete'); }
    public function manageStructure(User $u, Employee $e): bool { return $u->can('hr.salary.structure.edit'); }
}
