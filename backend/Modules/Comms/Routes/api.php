<?php

use Illuminate\Support\Facades\Route;
use Modules\Comms\Http\Controllers\CommController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::post('comm/email',     [CommController::class, 'sendEmail'])->name('comm.email');
    Route::post('comm/whatsapp',  [CommController::class, 'sendWhatsApp'])->name('comm.whatsapp');
    Route::get('comm/messages',   [CommController::class, 'messages'])->name('comm.messages');

    Route::get('comm/templates',                  [CommController::class, 'templates'])->name('comm.templates.index');
    Route::post('comm/templates',                 [CommController::class, 'storeTemplate'])->name('comm.templates.store');
    Route::patch('comm/templates/{template}',     [CommController::class, 'updateTemplate'])->name('comm.templates.update');
    Route::delete('comm/templates/{template}',    [CommController::class, 'destroyTemplate'])->name('comm.templates.destroy');
});
