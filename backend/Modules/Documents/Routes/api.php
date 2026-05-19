<?php

use Illuminate\Support\Facades\Route;
use Modules\Documents\Http\Controllers\DocumentController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::get('documents',                          [DocumentController::class, 'index'])->name('documents.index');
    Route::post('documents',                         [DocumentController::class, 'store'])->name('documents.store');
    Route::get('documents/{document}',               [DocumentController::class, 'show'])->name('documents.show');
    Route::delete('documents/{document}',            [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::get('documents/{document}/download',      [DocumentController::class, 'download'])->name('documents.download');
});
