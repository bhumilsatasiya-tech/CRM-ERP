<?php

namespace Modules\Sales\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\SalesOrder;
use Modules\Sales\Policies\InvoicePolicy;
use Modules\Sales\Policies\SalesOrderPolicy;
use Modules\Sales\Services\InvoiceService;
use Modules\Sales\Services\SalesOrderService;

class SalesServiceProvider extends ServiceProvider
{
    protected $policies = [
        SalesOrder::class => SalesOrderPolicy::class,
        Invoice::class    => InvoicePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(SalesOrderService::class);
        $this->app->singleton(InvoiceService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
