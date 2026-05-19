<?php

namespace Modules\Companies\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;
use Modules\Companies\Http\Middleware\EnsureCompanyContext;
use Modules\Companies\Models\Branch;
use Modules\Companies\Models\Company;
use Modules\Companies\Models\Warehouse;
use Modules\Companies\Policies\BranchPolicy;
use Modules\Companies\Policies\CompanyPolicy;
use Modules\Companies\Policies\WarehousePolicy;

class CompaniesServiceProvider extends ServiceProvider
{
    protected $policies = [
        Company::class   => CompanyPolicy::class,
        Branch::class    => BranchPolicy::class,
        Warehouse::class => WarehousePolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'companies');
    }

    public function boot(Router $router): void
    {
        $this->registerPolicies();

        // Register the company-context middleware alias.
        $router->aliasMiddleware('company.context', EnsureCompanyContext::class);

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
