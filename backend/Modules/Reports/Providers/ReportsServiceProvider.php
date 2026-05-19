<?php

namespace Modules\Reports\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Reports\Services\ReportService;

class ReportsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ReportService::class);
    }

    public function boot(): void
    {
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
