<?php

namespace Modules\Finance\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Modules\Finance\Listeners\AutoJournalListener;
use Modules\Finance\Models\Account;
use Modules\Finance\Models\JournalEntry;
use Modules\Finance\Policies\AccountPolicy;
use Modules\Finance\Policies\JournalEntryPolicy;
use Modules\Finance\Services\BalanceService;
use Modules\Finance\Services\JournalService;

class FinanceServiceProvider extends ServiceProvider
{
    protected $policies = [
        Account::class      => AccountPolicy::class,
        JournalEntry::class => JournalEntryPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(BalanceService::class);
        $this->app->singleton(JournalService::class);
        $this->app->singleton(AutoJournalListener::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');

        // Subscribe AutoJournalListener to events from existing modules.
        // Each handler is null-safe — listener silently skips + logs if settings missing.
        $bindings = [
            \Modules\Sales\Events\InvoicePosted::class             => 'onInvoicePosted',
            \Modules\Sales\Events\InvoicePaymentReceived::class    => 'onPaymentReceived',
            \Modules\Purchase\Events\PurchaseInvoicePosted::class  => 'onPurchaseInvoicePosted',
            \Modules\Purchase\Events\PurchaseInvoicePaymentMade::class => 'onPurchaseInvoicePayment',
            \Modules\Irm\Events\IrmReceived::class                 => 'onIrmReceived',
            \Modules\Irm\Events\BankRealizationRecorded::class     => 'onBankRealization',
            \Modules\Production\Events\ProductionBatchCompleted::class => 'onBatchCompleted',
            \Modules\InterCompany\Events\InterCompanyInvoicePosted::class => 'onIciPosted',
        ];
        foreach ($bindings as $event => $method) {
            Event::listen($event, [AutoJournalListener::class, $method]);
        }

        // Optional events from later modules — registered conditionally if classes exist (loaded via composer dump).
        if (class_exists('\Modules\Hr\Events\SalaryRunPosted')) {
            Event::listen('\Modules\Hr\Events\SalaryRunPosted', [AutoJournalListener::class, 'onSalaryRunPosted']);
        }
        if (class_exists('\Modules\Loans\Events\LoanPaymentReceived')) {
            Event::listen('\Modules\Loans\Events\LoanPaymentReceived', [AutoJournalListener::class, 'onLoanPaymentReceived']);
        }
    }
}
