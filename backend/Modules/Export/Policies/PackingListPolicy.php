<?php

namespace Modules\Export\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Export\Models\PackingList;

class PackingListPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('export.packing.view'); }
    public function view(User $u, PackingList $p): bool { return $u->can('export.packing.view'); }
    public function create(User $u): bool { return $u->can('export.packing.create'); }
    public function update(User $u, PackingList $p): bool { return $u->can('export.packing.update'); }
    public function delete(User $u, PackingList $p): bool { return $u->can('export.packing.delete'); }
    public function finalize(User $u, PackingList $p): bool { return $u->can('export.packing.finalize'); }
}
