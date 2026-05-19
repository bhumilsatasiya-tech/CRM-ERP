<?php

use Illuminate\Support\Facades\Route;
use Modules\Tracking\Http\Controllers\OrderTrackingController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::get('tracking',                          [OrderTrackingController::class, 'index'])->name('tracking.index');
    Route::get('tracking/sales-orders/{order}',     [OrderTrackingController::class, 'show'])->name('tracking.sales-orders.show');
});
