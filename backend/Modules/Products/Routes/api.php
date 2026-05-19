<?php

use Illuminate\Support\Facades\Route;
use Modules\Products\Http\Controllers\ProductCategoryController;
use Modules\Products\Http\Controllers\ProductCategoryLookupController;
use Modules\Products\Http\Controllers\ProductController;
use Modules\Products\Http\Controllers\ProductLookupController;
use Modules\Products\Http\Controllers\ProductUnitController;
use Modules\Products\Http\Controllers\ProductUnitLookupController;
use Modules\Products\Http\Controllers\ProductUomConversionController;

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'company.context'])->group(function () {

    // Lookup (autosuggest)
    Route::get('lookup/products',           ProductLookupController::class)->name('lookup.products');
    Route::get('lookup/product-categories', ProductCategoryLookupController::class)->name('lookup.product-categories');
    Route::get('lookup/product-units',      ProductUnitLookupController::class)->name('lookup.product-units');

    // Master CRUD
    Route::apiResource('products',          ProductController::class);
    Route::apiResource('product-categories', ProductCategoryController::class)->parameters(['product-categories' => 'category']);
    Route::apiResource('product-units',     ProductUnitController::class)->parameters(['product-units' => 'unit']);

    // Per-product UoM conversions
    Route::get('products/{product}/uom-conversions',           [ProductUomConversionController::class, 'index']);
    Route::post('products/{product}/uom-conversions',          [ProductUomConversionController::class, 'store']);
    Route::put('product-uom-conversions/{conv}',               [ProductUomConversionController::class, 'update']);
    Route::patch('product-uom-conversions/{conv}',             [ProductUomConversionController::class, 'update']);
    Route::delete('product-uom-conversions/{conv}',            [ProductUomConversionController::class, 'destroy']);
});
