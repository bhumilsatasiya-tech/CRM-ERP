<?php

namespace Modules\ExportIncentives\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\ExportIncentives\Models\ExportIncentiveClaim;
use Modules\ExportIncentives\Policies\ExportIncentiveClaimPolicy;
use Modules\ExportIncentives\Services\ExportIncentiveService;

class ExportIncentivesServiceProvider extends ServiceProvider
{
    protected $policies = [
        ExportIncentiveClaim::class => ExportIncentiveClaimPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(ExportIncentiveService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
