<?php

use Illuminate\Support\Facades\Route;
use Modules\Irm\Http\Controllers\IrmController;
use Modules\Irm\Http\Controllers\LodgementController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('irms', IrmController::class);
    Route::post('irms/{irm}/close',     [IrmController::class, 'close'])->name('irms.close');
    Route::post('irms/{irm}/cancel',    [IrmController::class, 'cancel'])->name('irms.cancel');
    Route::post('irms/{irm}/allocate',  [IrmController::class, 'allocate'])->name('irms.allocate');
    Route::delete('irms/{irm}/allocations/{allocation}', [IrmController::class, 'deallocate'])->name('irms.deallocate');

    Route::apiResource('lodgements', LodgementController::class);
    Route::post('lodgements/{lodgement}/rows',     [LodgementController::class, 'addRow'])->name('lodgements.rows.add');
    Route::delete('lodgements/{lodgement}/rows/{allocation}', [LodgementController::class, 'removeRow'])->name('lodgements.rows.remove');
    Route::patch('lodgements/{lodgement}/rows/{allocation}', [LodgementController::class, 'markRow'])->name('lodgements.rows.mark');
    Route::post('lodgements/{lodgement}/submit',   [LodgementController::class, 'submit'])->name('lodgements.submit');
    Route::post('lodgements/{lodgement}/accept',   [LodgementController::class, 'accept'])->name('lodgements.accept');
    Route::post('lodgements/{lodgement}/reject',   [LodgementController::class, 'reject'])->name('lodgements.reject');
    Route::post('lodgements/{lodgement}/cancel',   [LodgementController::class, 'cancel'])->name('lodgements.cancel');
});
