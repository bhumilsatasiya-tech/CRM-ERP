<?php

use Illuminate\Support\Facades\Route;
use Modules\Production\Http\Controllers\ProductionBatchController;
use Modules\Production\Http\Controllers\ProductionQualityCheckController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Production Batches
    Route::apiResource('production-batches', ProductionBatchController::class)->parameters(['production-batches' => 'batch']);
    Route::post('production-batches/{batch}/submit',   [ProductionBatchController::class, 'submit'])->name('production-batches.submit');
    Route::post('production-batches/{batch}/approve',  [ProductionBatchController::class, 'approve'])->name('production-batches.approve');
    Route::post('production-batches/{batch}/start',    [ProductionBatchController::class, 'start'])->name('production-batches.start');
    Route::post('production-batches/{batch}/complete', [ProductionBatchController::class, 'complete'])->name('production-batches.complete');
    Route::post('production-batches/{batch}/cancel',   [ProductionBatchController::class, 'cancel'])->name('production-batches.cancel');

    // Quality Checks (nested)
    Route::post('production-batches/{batch}/quality-checks',         [ProductionQualityCheckController::class, 'store'])->name('production-batches.qc.store');
    Route::delete('production-batches/{batch}/quality-checks/{qc}',  [ProductionQualityCheckController::class, 'destroy'])->name('production-batches.qc.destroy');
});
