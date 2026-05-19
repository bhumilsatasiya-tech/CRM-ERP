<?php

namespace Modules\Irm\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Irm\Models\Irm;
use Modules\Irm\Models\Lodgement;
use Modules\Irm\Policies\IrmPolicy;
use Modules\Irm\Policies\LodgementPolicy;
use Modules\Irm\Services\IrmService;
use Modules\Irm\Services\LodgementService;

class IrmServiceProvider extends ServiceProvider
{
    protected $policies = [
        Irm::class        => IrmPolicy::class,
        Lodgement::class  => LodgementPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(IrmService::class);
        $this->app->singleton(LodgementService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
