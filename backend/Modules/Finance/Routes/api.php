<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\AccountController;
use Modules\Finance\Http\Controllers\FinanceReportController;
use Modules\Finance\Http\Controllers\JournalEntryController;
use Modules\Finance\Http\Controllers\PartnerStatementController;
use Modules\Finance\Http\Controllers\VoucherController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('accounts', AccountController::class);

    Route::apiResource('journal-entries', JournalEntryController::class)->parameters(['journal-entries' => 'entry']);
    Route::post('journal-entries/{entry}/post',   [JournalEntryController::class, 'post'])->name('journal-entries.post');
    Route::post('journal-entries/{entry}/cancel', [JournalEntryController::class, 'cancel'])->name('journal-entries.cancel');

    Route::get('finance/trial-balance',           [FinanceReportController::class, 'trialBalance'])->name('finance.trial-balance');
    Route::get('finance/ledger/{accountId}',      [FinanceReportController::class, 'ledger'])->name('finance.ledger');
    Route::get('finance/ledger/{accountId}/pdf',  [FinanceReportController::class, 'ledgerPdf'])->name('finance.ledger.pdf');

    // Partner Statement (per-buyer/supplier ledger across invoices, payments, IRMs, etc.)
    Route::get('partners/{partner}/statement',     [PartnerStatementController::class, 'show'])->name('partners.statement');
    Route::get('partners/{partner}/statement/pdf', [PartnerStatementController::class, 'pdf'])->name('partners.statement.pdf');

    // Voucher endpoints (bulk receipt/payment apply across many open invoices for one partner)
    Route::get('vouchers/open-invoices',    [VoucherController::class, 'openInvoices'])->name('vouchers.open-invoices');
    Route::post('vouchers/supplier-payment',[VoucherController::class, 'supplierPayment'])->name('vouchers.supplier-payment');
    Route::post('vouchers/buyer-receipt',   [VoucherController::class, 'buyerReceipt'])->name('vouchers.buyer-receipt');

    // Standalone vouchers — thin wrappers that build a balanced JE and post it.
    Route::post('vouchers/bank-receipt',    [VoucherController::class, 'bankReceipt'])->name('vouchers.bank-receipt');
    Route::post('vouchers/expense',         [VoucherController::class, 'expense'])->name('vouchers.expense');
    Route::post('vouchers/contra',          [VoucherController::class, 'contra'])->name('vouchers.contra');
});
