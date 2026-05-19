<?php

namespace Modules\Loans\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Loans\Models\Loan;

class LoanPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('loan.view'); }
    public function view(User $u, Loan $l): bool { return $u->can('loan.view'); }
    public function create(User $u): bool { return $u->can('loan.create'); }
    public function update(User $u, Loan $l): bool { return $u->can('loan.update'); }
    public function delete(User $u, Loan $l): bool { return $u->can('loan.delete'); }
    public function payment(User $u, Loan $l): bool { return $u->can('loan.payment'); }
    public function close(User $u, Loan $l): bool { return $u->can('loan.close'); }
}
