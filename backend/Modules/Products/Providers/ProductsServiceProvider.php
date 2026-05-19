<?php

namespace Modules\Products\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Products\Models\Product;
use Modules\Products\Models\ProductCategory;
use Modules\Products\Models\ProductUnit;
use Modules\Products\Policies\ProductCategoryPolicy;
use Modules\Products\Policies\ProductPolicy;
use Modules\Products\Policies\ProductUnitPolicy;

class ProductsServiceProvider extends ServiceProvider
{
    protected $policies = [
        Product::class         => ProductPolicy::class,
        ProductCategory::class => ProductCategoryPolicy::class,
        ProductUnit::class     => ProductUnitPolicy::class,
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'products');
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
