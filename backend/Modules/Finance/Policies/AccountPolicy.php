<?php

namespace Modules\Finance\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Finance\Models\Account;

class AccountPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('finance.account.view'); }
    public function view(User $u, Account $a): bool { return $u->can('finance.account.view'); }
    public function create(User $u): bool { return $u->can('finance.account.create'); }
    public function update(User $u, Account $a): bool { return $u->can('finance.account.update') && ! $a->is_system; }
    public function delete(User $u, Account $a): bool { return $u->can('finance.account.delete') && ! $a->is_system; }
}
