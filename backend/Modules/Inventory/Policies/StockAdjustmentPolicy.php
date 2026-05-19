<?php

namespace Modules\Inventory\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Inventory\Models\StockAdjustment;

class StockAdjustmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('stock.adjustment.view'); }
    public function view(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.view'); }
    public function create(User $u): bool { return $u->can('stock.adjustment.create'); }
    public function update(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.update'); }
    public function delete(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.delete'); }
    public function submit(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.update'); }
    public function approve(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.approve'); }
    public function cancel(User $u, StockAdjustment $a): bool { return $u->can('stock.adjustment.approve'); }
}
