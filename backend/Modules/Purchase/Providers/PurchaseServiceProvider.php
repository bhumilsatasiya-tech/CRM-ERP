<?php

namespace Modules\Purchase\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Purchase\Models\Grn;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseOrder;
use Modules\Purchase\Policies\GrnPolicy;
use Modules\Purchase\Policies\PurchaseInvoicePolicy;
use Modules\Purchase\Policies\PurchaseOrderPolicy;
use Modules\Purchase\Services\PurchaseService;

class PurchaseServiceProvider extends ServiceProvider
{
    protected $policies = [
        PurchaseOrder::class   => PurchaseOrderPolicy::class,
        Grn::class             => GrnPolicy::class,
        PurchaseInvoice::class => PurchaseInvoicePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(PurchaseService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
