<?php

namespace Modules\Settings\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Settings\Models\Setting;

class SettingPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool { return $actor->can('setting.view'); }
    public function view(User $actor, Setting $s): bool { return $actor->can('setting.view'); }
    public function create(User $actor): bool { return $actor->can('setting.update'); }
    public function update(User $actor, Setting $s): bool { return $actor->can('setting.update'); }
    public function delete(User $actor, Setting $s): bool
    {
        if ($s->is_system) return false;
        return $actor->can('setting.update');
    }
}
