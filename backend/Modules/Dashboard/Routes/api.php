<?php

use Illuminate\Support\Facades\Route;
use Modules\Dashboard\Http\Controllers\DashboardController;

Route::prefix('v1/dashboard')->name('api.v1.dashboard.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::get('kpis', [DashboardController::class, 'kpis'])->name('kpis');
    Route::get('day-actions', [DashboardController::class, 'dayActions'])->name('day-actions');
});
