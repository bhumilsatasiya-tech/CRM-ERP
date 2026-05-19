<?php

use Illuminate\Support\Facades\Route;
use Modules\Tasks\Http\Controllers\TaskController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{task}/complete',       [TaskController::class, 'complete'])->name('tasks.complete');
    Route::post('tasks/{task}/reopen',         [TaskController::class, 'reopen'])->name('tasks.reopen');
    Route::post('tasks/{task}/sync-to-google', [TaskController::class, 'syncToGoogle'])->name('tasks.sync-to-google');
    Route::get('tasks/calendar/auth-url',      [TaskController::class, 'authUrl'])->name('tasks.calendar.auth-url');
    Route::get('tasks/calendar/callback',      [TaskController::class, 'callback'])->name('tasks.calendar.callback');
});
