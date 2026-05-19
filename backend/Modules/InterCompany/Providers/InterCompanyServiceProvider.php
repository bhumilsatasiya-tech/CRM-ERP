<?php

namespace Modules\InterCompany\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\InterCompany\Models\InterCompanyInvoice;
use Modules\InterCompany\Policies\InterCompanyInvoicePolicy;
use Modules\InterCompany\Services\InterCompanyInvoiceService;

class InterCompanyServiceProvider extends ServiceProvider
{
    protected $policies = [
        InterCompanyInvoice::class => InterCompanyInvoicePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(InterCompanyInvoiceService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
