<?php

namespace Modules\Settings\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Settings\Models\Sequence;
use Modules\Settings\Models\Setting;
use Modules\Settings\Policies\SequencePolicy;
use Modules\Settings\Policies\SettingPolicy;
use Modules\Settings\Services\SequenceService;
use Modules\Settings\Services\SettingService;

class SettingsServiceProvider extends ServiceProvider
{
    protected $policies = [
        Setting::class  => SettingPolicy::class,
        Sequence::class => SequencePolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'settings');

        $this->app->singleton(SettingService::class);
        $this->app->singleton(SequenceService::class);
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
