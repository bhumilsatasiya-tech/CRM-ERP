<?php

namespace Modules\Hr\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Hr\Models\SalaryRun;

class SalaryRunPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('hr.payroll.view'); }
    public function view(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.view'); }
    public function create(User $u): bool { return $u->can('hr.payroll.run'); }
    public function update(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.run'); }
    public function delete(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.cancel'); }
    public function post(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.post'); }
    public function cancel(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.cancel'); }
    public function markPaid(User $u, SalaryRun $r): bool { return $u->can('hr.payroll.markpaid'); }
}
