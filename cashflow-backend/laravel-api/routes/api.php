<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\TaxDeclarationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    // Internal route for OCR microservice (token-protected, not user auth)
    Route::post('/invoices/ocr-submit', [InvoiceController::class, 'ocrSubmit'])
        ->middleware('ocr.internal');
});

// Protected routes
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::patch('/invoices/{invoice}/status', [InvoiceController::class, 'updateStatus']);

    // Dashboard metrics
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Tax declarations
    Route::get('/declarations',          [TaxDeclarationController::class, 'index']);
    Route::post('/declarations/generate', [TaxDeclarationController::class, 'generate']);

    // Reports
    Route::get('/reports/csv',  [ReportController::class, 'exportCsv']);
    Route::get('/reports/pdf',  [ReportController::class, 'exportPdf']);
});
