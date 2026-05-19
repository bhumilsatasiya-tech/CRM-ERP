<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\AuditLogController;
use Modules\Settings\Http\Controllers\SequencesController;
use Modules\Settings\Http\Controllers\SettingsController;

Route::prefix('v1')->name('api.v1.')->middleware('auth:sanctum')->group(function () {

    // Public-flavoured for current user (no scope leak)
    Route::get('me/settings', [SettingsController::class, 'mySettings'])->name('me.settings');

    // Settings CRUD
    Route::apiResource('settings', SettingsController::class);

    // Sequences CRUD + preview
    Route::get('sequences/preview', [SequencesController::class, 'previewByDocType'])
        ->name('sequences.preview-by-doc-type');
    Route::apiResource('sequences', SequencesController::class);
    Route::get('sequences/{sequence}/preview-next', [SequencesController::class, 'previewNext'])
        ->name('sequences.preview-next');

    // Audit log (read-only)
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('audit-logs/{id}', [AuditLogController::class, 'show'])->name('audit-logs.show');
});
