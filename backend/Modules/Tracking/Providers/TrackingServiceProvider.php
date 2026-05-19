<?php

namespace Modules\Tracking\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Tracking\Services\OrderTrackingService;

class TrackingServiceProvider extends ServiceProvider
{
    protected $policies = [];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'tracking');
        $this->app->singleton(OrderTrackingService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
