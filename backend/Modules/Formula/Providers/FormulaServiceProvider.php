<?php

namespace Modules\Formula\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Formula\Models\Formula;
use Modules\Formula\Policies\FormulaPolicy;
use Modules\Formula\Services\FormulaService;

class FormulaServiceProvider extends ServiceProvider
{
    protected $policies = [
        Formula::class => FormulaPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(FormulaService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
