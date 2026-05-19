<?php

use Illuminate\Support\Facades\Route;
use Modules\Sales\Http\Controllers\InvoiceController;
use Modules\Sales\Http\Controllers\SalesOrderController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Sales Orders
    Route::apiResource('sales-orders', SalesOrderController::class)->parameters(['sales-orders' => 'order']);
    Route::post('sales-orders/{order}/approve', [SalesOrderController::class, 'approve'])->name('sales-orders.approve');
    Route::post('sales-orders/{order}/cancel',  [SalesOrderController::class, 'cancel'])->name('sales-orders.cancel');
    Route::get('sales-orders/{order}/pdf',      [SalesOrderController::class, 'pdf'])->name('sales-orders.pdf');

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('invoices/{invoice}/post',   [InvoiceController::class, 'post'])->name('invoices.post');
    Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('invoices.cancel');
    Route::get('invoices/{invoice}/pdf',     [InvoiceController::class, 'pdf'])->name('invoices.pdf');

    // Invoice payments (nested)
    Route::post('invoices/{invoice}/payments',                  [InvoiceController::class, 'recordPayment'])->name('invoices.payments.store');
    Route::delete('invoices/{invoice}/payments/{payment}',      [InvoiceController::class, 'deletePayment'])->name('invoices.payments.destroy');
});
