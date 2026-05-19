<?php

namespace Modules\Production\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Production\Models\ProductionBatch;
use Modules\Production\Policies\ProductionBatchPolicy;
use Modules\Production\Services\ProductionBatchService;

class ProductionServiceProvider extends ServiceProvider
{
    protected $policies = [
        ProductionBatch::class => ProductionBatchPolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'production');
        $this->app->singleton(ProductionBatchService::class);
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
