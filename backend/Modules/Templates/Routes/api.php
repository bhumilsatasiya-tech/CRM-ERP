<?php

use Illuminate\Support\Facades\Route;
use Modules\Templates\Http\Controllers\DocumentTemplateController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('document-templates', DocumentTemplateController::class)->parameters(['document-templates' => 'template']);
    Route::get('document-templates/{template}/preview',  [DocumentTemplateController::class, 'preview'])->name('document-templates.preview');
    Route::post('document-templates/{template}/default', [DocumentTemplateController::class, 'makeDefault'])->name('document-templates.default');
});
