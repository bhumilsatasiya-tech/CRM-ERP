<?php

namespace Modules\Templates\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Templates\Models\DocumentTemplate;
use Modules\Templates\Policies\DocumentTemplatePolicy;
use Modules\Templates\Services\PdfService;
use Modules\Templates\Services\TemplateContextBuilder;
use Modules\Templates\Services\TemplateRenderer;
use Modules\Templates\Services\TemplateService;

class TemplatesServiceProvider extends ServiceProvider
{
    protected $policies = [
        DocumentTemplate::class => DocumentTemplatePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(TemplateRenderer::class);
        $this->app->singleton(TemplateContextBuilder::class);
        $this->app->singleton(TemplateService::class);
        $this->app->singleton(PdfService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
