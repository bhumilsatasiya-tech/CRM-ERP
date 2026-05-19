<?php

use Illuminate\Support\Facades\Route;
use Modules\Companies\Http\Controllers\BranchController;
use Modules\Companies\Http\Controllers\CompanyController;
use Modules\Companies\Http\Controllers\UserCompanyController;
use Modules\Companies\Http\Controllers\WarehouseController;

Route::prefix('v1')->name('api.v1.')->middleware('auth:sanctum')->group(function () {

    // Current user's companies + active company switcher
    Route::get('me/companies', [UserCompanyController::class, 'myCompanies'])->name('me.companies');
    Route::post('me/active-company', [UserCompanyController::class, 'setActiveCompany'])->name('me.active-company');

    // Companies CRUD — managing companies themselves doesn't require an active-company context
    // (you might be creating your FIRST company, or managing one you don't have selected).
    Route::apiResource('companies', CompanyController::class);

    // Apply EnsureCompanyContext to all company-scoped routes below
    Route::middleware('company.context')->group(function () {

        // Branches under a company
        Route::get('companies/{company}/branches', [BranchController::class, 'index'])->name('companies.branches.index');
        Route::post('companies/{company}/branches', [BranchController::class, 'store'])->name('companies.branches.store');
        Route::get('branches/{branch}', [BranchController::class, 'show'])->name('branches.show');
        Route::put('branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
        Route::patch('branches/{branch}', [BranchController::class, 'update']);
        Route::delete('branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy');

        // Warehouses under a company
        Route::get('companies/{company}/warehouses', [WarehouseController::class, 'index'])->name('companies.warehouses.index');
        Route::post('companies/{company}/warehouses', [WarehouseController::class, 'store'])->name('companies.warehouses.store');
        Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show'])->name('warehouses.show');
        Route::put('warehouses/{warehouse}', [WarehouseController::class, 'update'])->name('warehouses.update');
        Route::patch('warehouses/{warehouse}', [WarehouseController::class, 'update']);
        Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->name('warehouses.destroy');

        // User <-> Company assignment
        Route::post('companies/{company}/users/{user}', [UserCompanyController::class, 'attach'])->name('companies.users.attach');
        Route::delete('companies/{company}/users/{user}', [UserCompanyController::class, 'detach'])->name('companies.users.detach');
    });
});
