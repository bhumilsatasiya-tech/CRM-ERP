<?php

use Illuminate\Support\Facades\Route;
use Modules\Formula\Http\Controllers\FormulaController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('formulas', FormulaController::class);
    Route::post('formulas/{formula}/activate', [FormulaController::class, 'activate'])->name('formulas.activate');
    Route::get('formulas/{formula}/pdf',        [FormulaController::class, 'pdf'])->name('formulas.pdf');
    Route::get('formulas-scale',                [FormulaController::class, 'scale'])->name('formulas.scale');
});
