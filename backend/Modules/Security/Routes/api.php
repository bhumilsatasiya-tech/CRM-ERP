<?php

use Illuminate\Support\Facades\Route;
use Modules\Security\Http\Controllers\SecurityController;

Route::prefix('v1/security')->name('api.v1.security.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    // Master ON/OFF for the entire PIN-lock system (per company)
    Route::get ('master', [SecurityController::class, 'master'])->name('master');
    Route::put ('master', [SecurityController::class, 'setMaster'])->name('master.set');

    // Module locks (admin-only — uses security.lock.manage permission)
    Route::get ('module-locks',                  [SecurityController::class, 'locks'])->name('locks');
    Route::put ('module-locks/{moduleKey}',      [SecurityController::class, 'setLock'])->name('locks.set');

    // PIN — anyone with a Sanctum token can manage their own
    Route::get   ('pin/status', [SecurityController::class, 'pinStatus'])->name('pin.status');
    Route::post  ('pin',        [SecurityController::class, 'setPin'])->name('pin.set');
    Route::delete('pin',        [SecurityController::class, 'removePin'])->name('pin.remove');

    // Unlock + check + clear (per module)
    Route::post('unlock/{moduleKey}',        [SecurityController::class, 'unlock'])->name('unlock');
    Route::get ('unlock-status/{moduleKey}', [SecurityController::class, 'unlockStatus'])->name('unlock-status');
    Route::post('lock/{moduleKey}',          [SecurityController::class, 'clearUnlock'])->name('clear-unlock');
});
