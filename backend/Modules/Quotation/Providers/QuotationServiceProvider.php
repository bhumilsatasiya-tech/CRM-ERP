<?php

namespace Modules\Quotation\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Quotation\Models\Quotation;
use Modules\Quotation\Policies\QuotationPolicy;
use Modules\Quotation\Services\QuotationService;

class QuotationServiceProvider extends ServiceProvider
{
    protected $policies = [Quotation::class => QuotationPolicy::class];

    public function register(): void
    {
        $this->app->singleton(QuotationService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
