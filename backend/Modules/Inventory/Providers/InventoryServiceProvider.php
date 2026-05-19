<?php

namespace Modules\Inventory\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Inventory\Models\StockAdjustment;
use Modules\Inventory\Models\StockTransfer;
use Modules\Inventory\Policies\StockAdjustmentPolicy;
use Modules\Inventory\Policies\StockTransferPolicy;
use Modules\Inventory\Services\StockAdjustmentService;
use Modules\Inventory\Services\StockService;
use Modules\Inventory\Services\StockTransferService;

class InventoryServiceProvider extends ServiceProvider
{
    protected $policies = [
        StockAdjustment::class => StockAdjustmentPolicy::class,
        StockTransfer::class   => StockTransferPolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'inventory');

        // StockService is the *single* point of stock movement.
        // Singleton so other modules get the same instance per-request.
        $this->app->singleton(StockService::class);
        $this->app->singleton(StockAdjustmentService::class);
        $this->app->singleton(StockTransferService::class);
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
