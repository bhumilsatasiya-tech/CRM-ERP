<?php

namespace Modules\Loans\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Loans\Models\Loan;
use Modules\Loans\Policies\LoanPolicy;
use Modules\Loans\Services\LoanService;

class LoansServiceProvider extends ServiceProvider
{
    protected $policies = [
        Loan::class => LoanPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(LoanService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
