<?php

namespace Modules\Production\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Production\Models\ProductionBatch;

class ProductionBatchPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool          { return $u->can('production.view'); }
    public function view(User $u, ProductionBatch $b): bool   { return $u->can('production.view'); }
    public function create(User $u): bool           { return $u->can('production.create'); }
    public function update(User $u, ProductionBatch $b): bool { return $u->can('production.update'); }
    public function delete(User $u, ProductionBatch $b): bool { return $u->can('production.delete'); }

    public function submit(User $u, ProductionBatch $b): bool   { return $u->can('production.submit'); }
    public function approve(User $u, ProductionBatch $b): bool  { return $u->can('production.approve'); }
    public function start(User $u, ProductionBatch $b): bool    { return $u->can('production.start'); }
    public function complete(User $u, ProductionBatch $b): bool { return $u->can('production.complete'); }
    public function cancel(User $u, ProductionBatch $b): bool   { return $u->can('production.cancel'); }

    public function viewQuality(User $u, ProductionBatch $b): bool   { return $u->can('production.quality.view'); }
    public function recordQuality(User $u, ProductionBatch $b): bool { return $u->can('production.quality.record'); }
}
