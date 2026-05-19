<?php

use Illuminate\Support\Facades\Route;
use Modules\Loans\Http\Controllers\LoanController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('loans', LoanController::class);
    Route::post('loans/{loan}/payments', [LoanController::class, 'recordPayment'])->name('loans.payments');
    Route::post('loans/{loan}/cancel',   [LoanController::class, 'cancel'])->name('loans.cancel');
});
