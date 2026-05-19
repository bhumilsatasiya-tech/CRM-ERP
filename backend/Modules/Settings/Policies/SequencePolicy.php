<?php

namespace Modules\Settings\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Settings\Models\Sequence;

class SequencePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool   { return $actor->can('sequence.view'); }
    public function view(User $actor, Sequence $s): bool   { return $actor->can('sequence.view'); }
    public function create(User $actor): bool    { return $actor->can('sequence.create'); }
    public function update(User $actor, Sequence $s): bool { return $actor->can('sequence.update'); }
    public function delete(User $actor, Sequence $s): bool { return $actor->can('sequence.delete'); }
}
