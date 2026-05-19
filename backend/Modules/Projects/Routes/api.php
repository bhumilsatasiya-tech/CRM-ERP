<?php

use Illuminate\Support\Facades\Route;
use Modules\Projects\Http\Controllers\ProjectController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('projects', ProjectController::class);

    Route::get   ('projects/{project}/summary',                 [ProjectController::class, 'summary'])->name('projects.summary');
    Route::post  ('projects/{project}/cost-entries',            [ProjectController::class, 'addEntry'])->name('projects.entries.add');
    Route::put   ('projects/{project}/cost-entries/{entry}',    [ProjectController::class, 'updateEntry'])->name('projects.entries.update');
    Route::delete('projects/{project}/cost-entries/{entry}',    [ProjectController::class, 'deleteEntry'])->name('projects.entries.delete');
});
