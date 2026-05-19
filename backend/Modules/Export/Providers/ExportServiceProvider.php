<?php

namespace Modules\Export\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\PackingList;
use Modules\Export\Models\ShippingBill;
use Modules\Export\Models\TaxInvoice;
use Modules\Export\Policies\ExportInvoicePolicy;
use Modules\Export\Policies\PackingListPolicy;
use Modules\Export\Policies\ShippingBillPolicy;
use Modules\Export\Policies\TaxInvoicePolicy;
use Modules\Export\Contracts\OcrProvider;
use Modules\Export\Services\ExportInvoiceService;
use Modules\Export\Services\Ocr\StubOcrProvider;
use Modules\Export\Services\PackingListService;
use Modules\Export\Services\ShippingBillService;
use Modules\Export\Services\TaxInvoiceService;

class ExportServiceProvider extends ServiceProvider
{
    protected $policies = [
        ExportInvoice::class => ExportInvoicePolicy::class,
        ShippingBill::class  => ShippingBillPolicy::class,
        PackingList::class   => PackingListPolicy::class,
        TaxInvoice::class    => TaxInvoicePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(ExportInvoiceService::class);
        $this->app->singleton(ShippingBillService::class);
        $this->app->singleton(PackingListService::class);
        $this->app->singleton(TaxInvoiceService::class);

        // OCR provider — bind by env var. Default StubOcrProvider throws clear error until configured.
        // Add real providers like: 'tesseract' => TesseractOcrProvider::class, etc.
        $this->app->singleton(OcrProvider::class, function () {
            $providerClass = env('OCR_PROVIDER_CLASS');
            if ($providerClass && class_exists($providerClass)) {
                return $this->app->make($providerClass);
            }
            return $this->app->make(StubOcrProvider::class);
        });
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');
    }
}
