<?php

namespace Modules\Inventory\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Inventory\Models\StockTransfer;

class StockTransferPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $u): bool { return $u->can('stock.transfer.view'); }
    public function view(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.view'); }
    public function create(User $u): bool { return $u->can('stock.transfer.create'); }
    public function update(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.update'); }
    public function delete(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.delete'); }
    public function send(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.update'); }
    public function receive(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.update'); }
    public function cancel(User $u, StockTransfer $t): bool { return $u->can('stock.transfer.update'); }
}
