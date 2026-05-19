<?php

namespace Modules\Auth\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Modules\Auth\Models\User;
use Modules\Auth\Policies\RolePolicy;
use Modules\Auth\Policies\UserPolicy;
use Spatie\Permission\Models\Role;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        User::class => UserPolicy::class,
        Role::class => RolePolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'auth_module');

        // We ship our own personal_access_tokens migration in this module
        // (with expires_at + indexes). Skip Sanctum's vendor migration to
        // prevent a duplicate-table conflict.
        Sanctum::ignoreMigrations();
    }

    public function boot(): void
    {
        $this->registerPolicies();

        Gate::before(function ($user) {
            if (method_exists($user, 'hasRole')
                && $user->hasRole(config('auth_module.super_admin_role', 'super-admin'))) {
                return true;
            }
            return null;
        });

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
