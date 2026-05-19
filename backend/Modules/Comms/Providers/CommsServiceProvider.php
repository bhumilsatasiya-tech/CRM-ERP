<?php

namespace Modules\Comms\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Comms\Contracts\WhatsAppProvider;
use Modules\Comms\Services\CommService;

class CommsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind WhatsAppProvider to whatever driver is configured (default: placeholder).
        $this->app->bind(WhatsAppProvider::class, function () {
            $driver = (string) env('WHATSAPP_PROVIDER', 'placeholder');
            return match ($driver) {
                'placeholder' => new PlaceholderWhatsAppProvider(),
                default => new PlaceholderWhatsAppProvider(),
            };
        });
        $this->app->singleton(CommService::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
