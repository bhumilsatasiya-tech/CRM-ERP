<?php

use Illuminate\Support\Facades\Route;
use Modules\ExportIncentives\Http\Controllers\ExportIncentiveClaimController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('export-incentive-claims', ExportIncentiveClaimController::class)
        ->parameters(['export-incentive-claims' => 'claim']);
    Route::post('export-incentive-claims/{claim}/transition', [ExportIncentiveClaimController::class, 'transition'])
        ->name('export-incentive-claims.transition');
});
