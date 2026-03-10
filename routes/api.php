<?php

use App\Http\Controllers\Api\CustomerApiController;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\Api\ReportApiController;
use App\Http\Controllers\Api\SaleApiController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // Products
    Route::get('products', [ProductApiController::class, 'index']);
    Route::get('products/low-stock', [ProductApiController::class, 'lowStock']);
    Route::get('products/{product}', [ProductApiController::class, 'show']);

    // Sales
    Route::get('sales', [SaleApiController::class, 'index']);
    Route::get('sales/{sale}', [SaleApiController::class, 'show']);

    // Customers
    Route::get('customers', [CustomerApiController::class, 'index']);
    Route::get('customers/{customer}', [CustomerApiController::class, 'show']);

    // Reports
    Route::get('reports/sales', [ReportApiController::class, 'sales']);
    Route::get('reports/inventory', [ReportApiController::class, 'inventory']);
    Route::get('reports/z-report', [ReportApiController::class, 'zReport']);
});
