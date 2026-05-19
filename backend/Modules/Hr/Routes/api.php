<?php

use Illuminate\Support\Facades\Route;
use Modules\Hr\Http\Controllers\DesignationController;
use Modules\Hr\Http\Controllers\EmployeeController;
use Modules\Hr\Http\Controllers\SalaryComponentController;
use Modules\Hr\Http\Controllers\SalaryRunController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {
    Route::apiResource('employees', EmployeeController::class);
    Route::post('employees/{employee}/salary-structure', [EmployeeController::class, 'setStructure'])->name('employees.set-structure');

    Route::get('designations',                  [DesignationController::class, 'index'])->name('designations.index');
    Route::post('designations',                 [DesignationController::class, 'store'])->name('designations.store');
    Route::patch('designations/{designation}',  [DesignationController::class, 'update'])->name('designations.update');
    Route::delete('designations/{designation}', [DesignationController::class, 'destroy'])->name('designations.destroy');

    Route::get('salary-components',                 [SalaryComponentController::class, 'index'])->name('salary-components.index');
    Route::post('salary-components',                [SalaryComponentController::class, 'store'])->name('salary-components.store');
    Route::patch('salary-components/{component}',   [SalaryComponentController::class, 'update'])->name('salary-components.update');
    Route::delete('salary-components/{component}',  [SalaryComponentController::class, 'destroy'])->name('salary-components.destroy');

    Route::apiResource('salary-runs', SalaryRunController::class)->parameters(['salary-runs' => 'run']);
    Route::post('salary-runs/{run}/post',   [SalaryRunController::class, 'post'])->name('salary-runs.post');
    Route::post('salary-runs/{run}/cancel', [SalaryRunController::class, 'cancel'])->name('salary-runs.cancel');
    Route::post('salary-runs/{run}/payslips/{payslip}/mark-paid', [SalaryRunController::class, 'markPaid'])->name('salary-runs.mark-paid');
});
