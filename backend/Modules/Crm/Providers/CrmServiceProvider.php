<?php

namespace Modules\Crm\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Crm\Models\Partner;
use Modules\Crm\Policies\PartnerPolicy;

class CrmServiceProvider extends ServiceProvider
{
    protected $policies = [
        Partner::class => PartnerPolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'crm');
    }

    public function boot(): void
    {
        $this->registerPolicies();

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
