<?php

use Illuminate\Support\Facades\Route;
use Modules\Export\Http\Controllers\ExportInvoiceController;
use Modules\Export\Http\Controllers\PackingListController;
use Modules\Export\Http\Controllers\ShippingBillController;
use Modules\Export\Http\Controllers\TaxInvoiceController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    Route::apiResource('export-invoices', ExportInvoiceController::class)->parameters(['export-invoices' => 'invoice']);
    Route::post('export-invoices/{invoice}/post',   [ExportInvoiceController::class, 'post'])->name('export-invoices.post');
    Route::post('export-invoices/{invoice}/cancel', [ExportInvoiceController::class, 'cancel'])->name('export-invoices.cancel');
    Route::post('export-invoices/{invoice}/companion-docs', [ExportInvoiceController::class, 'ensureCompanionDocs'])->name('export-invoices.companion-docs');
    Route::get('export-invoices/{invoice}/pdf',     [ExportInvoiceController::class, 'pdf'])->name('export-invoices.pdf');

    Route::post('shipping-bills/extract-from-pdf', [ShippingBillController::class, 'extractFromPdf'])->name('shipping-bills.extract-from-pdf');
    Route::apiResource('shipping-bills', ShippingBillController::class)->parameters(['shipping-bills' => 'bill']);
    Route::post('shipping-bills/{bill}/dispatch', [ShippingBillController::class, 'dispatchBill'])->name('shipping-bills.dispatch');
    Route::post('shipping-bills/{bill}/cancel',   [ShippingBillController::class, 'cancel'])->name('shipping-bills.cancel');

    Route::apiResource('packing-lists', PackingListController::class)->parameters(['packing-lists' => 'packingList']);
    Route::post('packing-lists/{packingList}/finalize', [PackingListController::class, 'finalize'])->name('packing-lists.finalize');
    Route::post('packing-lists/{packingList}/cancel',   [PackingListController::class, 'cancel'])->name('packing-lists.cancel');

    Route::apiResource('tax-invoices', TaxInvoiceController::class)->parameters(['tax-invoices' => 'taxInvoice']);
    Route::post('tax-invoices/{taxInvoice}/post',   [TaxInvoiceController::class, 'post'])->name('tax-invoices.post');
    Route::post('tax-invoices/{taxInvoice}/cancel', [TaxInvoiceController::class, 'cancel'])->name('tax-invoices.cancel');
    Route::get('tax-invoices/{taxInvoice}/pdf',     [TaxInvoiceController::class, 'pdf'])->name('tax-invoices.pdf');
});
