<?php

use Illuminate\Support\Facades\Route;
use Modules\Crm\Http\Controllers\PartnerAddressController;
use Modules\Crm\Http\Controllers\PartnerBankAccountController;
use Modules\Crm\Http\Controllers\PartnerContactController;
use Modules\Crm\Http\Controllers\PartnerController;
use Modules\Crm\Http\Controllers\PartnerLookupController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Lookup (autosuggest)
    Route::get('lookup/partners', PartnerLookupController::class)->name('lookup.partners');

    // Partners CRUD
    Route::apiResource('partners', PartnerController::class);

    // Nested: contacts
    Route::get('partners/{partner}/contacts',          [PartnerContactController::class, 'index']);
    Route::post('partners/{partner}/contacts',         [PartnerContactController::class, 'store']);
    Route::put('partner-contacts/{contact}',           [PartnerContactController::class, 'update']);
    Route::patch('partner-contacts/{contact}',         [PartnerContactController::class, 'update']);
    Route::delete('partner-contacts/{contact}',        [PartnerContactController::class, 'destroy']);

    // Nested: addresses
    Route::get('partners/{partner}/addresses',         [PartnerAddressController::class, 'index']);
    Route::post('partners/{partner}/addresses',        [PartnerAddressController::class, 'store']);
    Route::put('partner-addresses/{address}',          [PartnerAddressController::class, 'update']);
    Route::patch('partner-addresses/{address}',        [PartnerAddressController::class, 'update']);
    Route::delete('partner-addresses/{address}',       [PartnerAddressController::class, 'destroy']);

    // Nested: bank accounts
    Route::get('partners/{partner}/bank-accounts',     [PartnerBankAccountController::class, 'index']);
    Route::post('partners/{partner}/bank-accounts',    [PartnerBankAccountController::class, 'store']);
    Route::put('partner-bank-accounts/{bank}',         [PartnerBankAccountController::class, 'update']);
    Route::patch('partner-bank-accounts/{bank}',       [PartnerBankAccountController::class, 'update']);
    Route::delete('partner-bank-accounts/{bank}',      [PartnerBankAccountController::class, 'destroy']);
});
