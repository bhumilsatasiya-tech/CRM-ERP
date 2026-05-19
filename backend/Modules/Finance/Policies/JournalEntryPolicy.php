<?php

namespace Modules\Finance\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Finance\Models\JournalEntry;

class JournalEntryPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $u): bool { return $u->can('finance.journal.view'); }
    public function view(User $u, JournalEntry $j): bool { return $u->can('finance.journal.view'); }
    public function create(User $u): bool { return $u->can('finance.journal.create'); }
    public function update(User $u, JournalEntry $j): bool { return $u->can('finance.journal.update'); }
    public function delete(User $u, JournalEntry $j): bool { return $u->can('finance.journal.delete'); }
    public function post(User $u, JournalEntry $j): bool { return $u->can('finance.journal.post'); }
    public function cancel(User $u, JournalEntry $j): bool { return $u->can('finance.journal.cancel'); }
}
