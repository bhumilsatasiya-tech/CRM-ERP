<?php

use Illuminate\Support\Facades\Route;
use Modules\InterCompany\Http\Controllers\InterCompanyInvoiceController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('inter-company-invoices', InterCompanyInvoiceController::class)->parameters(['inter-company-invoices' => 'invoice']);
    Route::post('inter-company-invoices/{invoice}/post',   [InterCompanyInvoiceController::class, 'post'])->name('inter-company-invoices.post');
    Route::post('inter-company-invoices/{invoice}/cancel', [InterCompanyInvoiceController::class, 'cancel'])->name('inter-company-invoices.cancel');
});
