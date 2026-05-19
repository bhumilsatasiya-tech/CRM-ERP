<?php

use Illuminate\Support\Facades\Route;
use Modules\Reports\Http\Controllers\ReportController;

Route::prefix('v1/reports')->name('api.v1.reports.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::get('sales-register',      [ReportController::class, 'salesRegister'])->name('sales-register');
    Route::get('purchase-register',   [ReportController::class, 'purchaseRegister'])->name('purchase-register');
    Route::get('stock-summary',       [ReportController::class, 'stockSummary'])->name('stock-summary');
    Route::get('production-summary',  [ReportController::class, 'productionSummary'])->name('production-summary');
    Route::get('payments-receivable', [ReportController::class, 'paymentsReceivable'])->name('payments-receivable');
    Route::get('payments-payable',    [ReportController::class, 'paymentsPayable'])->name('payments-payable');
    Route::get('profit-and-loss',     [ReportController::class, 'profitAndLoss'])->name('pl');
    Route::get('balance-sheet',       [ReportController::class, 'balanceSheet'])->name('bs');
    Route::get('export-realization',  [ReportController::class, 'exportRealization'])->name('export-realization');

    // Generic PDF endpoint for any of the above reports.
    // Path param "code" matches the slug used in REPORT_DEFS on the frontend.
    Route::get('{code}/pdf', [ReportController::class, 'pdf'])
        ->where('code', '[a-z0-9-]+')
        ->name('pdf');
});
