<?php

use Illuminate\Support\Facades\Route;
use Modules\Purchase\Http\Controllers\GrnController;
use Modules\Purchase\Http\Controllers\PurchaseInvoiceController;
use Modules\Purchase\Http\Controllers\PurchaseOrderController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Purchase Orders
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->parameters(['purchase-orders' => 'order']);
    Route::post('purchase-orders/{order}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    Route::post('purchase-orders/{order}/cancel',  [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');
    Route::get('purchase-orders/{order}/pdf',      [PurchaseOrderController::class, 'pdf'])->name('purchase-orders.pdf');

    // GRNs
    Route::apiResource('grns', GrnController::class)->parameters(['grns' => 'grn']);
    Route::post('grns/{grn}/receive', [GrnController::class, 'receive'])->name('grns.receive');
    Route::post('grns/{grn}/cancel',  [GrnController::class, 'cancel'])->name('grns.cancel');

    // Purchase Invoices
    Route::apiResource('purchase-invoices', PurchaseInvoiceController::class)->parameters(['purchase-invoices' => 'invoice']);
    Route::post('purchase-invoices/{invoice}/post',   [PurchaseInvoiceController::class, 'post'])->name('purchase-invoices.post');
    Route::post('purchase-invoices/{invoice}/cancel', [PurchaseInvoiceController::class, 'cancel'])->name('purchase-invoices.cancel');

    // Supplier payments (single-PI)
    Route::post  ('purchase-invoices/{invoice}/payments',           [PurchaseInvoiceController::class, 'recordPayment'])->name('purchase-invoices.payments.store');
    Route::delete('purchase-invoices/{invoice}/payments/{payment}', [PurchaseInvoiceController::class, 'deletePayment'])->name('purchase-invoices.payments.destroy');
});
