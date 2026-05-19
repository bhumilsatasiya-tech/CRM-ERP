<?php

use Illuminate\Support\Facades\Route;
use Modules\Inventory\Http\Controllers\StockAdjustmentController;
use Modules\Inventory\Http\Controllers\StockLedgerController;
use Modules\Inventory\Http\Controllers\StockTransferController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Ledger viewer + reports
    Route::get('stock/ledger',           [StockLedgerController::class, 'index'])->name('stock.ledger.index');
    Route::get('stock/current',          [StockLedgerController::class, 'current'])->name('stock.current');
    Route::get('stock/reports/low-stock',[StockLedgerController::class, 'lowStock'])->name('stock.reports.low-stock');
    Route::get('stock/reports/valuation',[StockLedgerController::class, 'valuation'])->name('stock.reports.valuation');

    // Adjustments
    Route::apiResource('stock/adjustments', StockAdjustmentController::class)->parameters(['adjustments' => 'adjustment']);
    Route::post('stock/adjustments/{adjustment}/submit',  [StockAdjustmentController::class, 'submit'])->name('stock.adjustments.submit');
    Route::post('stock/adjustments/{adjustment}/approve', [StockAdjustmentController::class, 'approve'])->name('stock.adjustments.approve');
    Route::post('stock/adjustments/{adjustment}/cancel',  [StockAdjustmentController::class, 'cancel'])->name('stock.adjustments.cancel');

    // Transfers
    Route::apiResource('stock/transfers', StockTransferController::class)->parameters(['transfers' => 'transfer']);
    Route::post('stock/transfers/{transfer}/send',    [StockTransferController::class, 'send'])->name('stock.transfers.send');
    Route::post('stock/transfers/{transfer}/receive', [StockTransferController::class, 'receive'])->name('stock.transfers.receive');
    Route::post('stock/transfers/{transfer}/cancel',  [StockTransferController::class, 'cancel'])->name('stock.transfers.cancel');
});
