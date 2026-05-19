<?php

namespace Modules\Hr\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Hr\Models\Employee;
use Modules\Hr\Models\SalaryRun;
use Modules\Hr\Policies\EmployeePolicy;
use Modules\Hr\Policies\SalaryRunPolicy;
use Modules\Hr\Services\PayrollService;

class HrServiceProvider extends ServiceProvider
{
    protected $policies = [
        Employee::class  => EmployeePolicy::class,
        SalaryRun::class => SalaryRunPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(PayrollService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
