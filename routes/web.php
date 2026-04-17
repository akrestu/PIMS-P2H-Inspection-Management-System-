<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DataExportController;
use App\Http\Controllers\DriverDashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\P2hComplianceController;
use App\Http\Controllers\UnitDowntimeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\P2hExportController;
use App\Http\Controllers\P2hSessionController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

// Root redirect: role-aware
Route::get('/', function () {
    if (auth()->check() && auth()->user()->hasRole('driver')) {
        return redirect()->route('driver.dashboard');
    }
    return redirect()->route('dashboard');
})->name('home');

Route::middleware(['auth'])->group(function () {
    // Dashboard — admin & manager only; driver diarahkan ke /driver/dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('role:admin|manager')
        ->name('dashboard');

    // Driver Dashboard
    Route::get('/driver/dashboard', [DriverDashboardController::class, 'index'])
        ->middleware('role:driver')
        ->name('driver.dashboard');

    // P2H
    Route::get('/p2h', [P2hSessionController::class, 'index'])->name('p2h.index');
    Route::get('/p2h/form', [P2hSessionController::class, 'create'])->name('p2h.create');
    Route::post('/p2h', [P2hSessionController::class, 'store'])->name('p2h.store');
    Route::get('/p2h/{session}', [P2hSessionController::class, 'show'])->name('p2h.show');
    Route::get('/p2h/{session}/export-pdf', [P2hExportController::class, 'exportPdf'])->name('p2h.export-pdf');

    // AJAX — cek slot unit hari ini
    Route::get('/api/p2h/check-slot', [P2hSessionController::class, 'checkSlot'])->name('p2h.check-slot');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Monitoring PA & Downtime Log — admin & manager
    Route::middleware(['role:admin|manager'])->group(function () {
        Route::get('/monitoring', [MonitoringController::class, 'index'])->name('monitoring.index');
        Route::get('/p2h-compliance', [P2hComplianceController::class, 'index'])->name('p2h.compliance');

        Route::get('/downtime', [UnitDowntimeController::class, 'index'])->name('downtime.index');
        Route::post('/downtime', [UnitDowntimeController::class, 'store'])->name('downtime.store');
        Route::patch('/downtime/{log}', [UnitDowntimeController::class, 'update'])->name('downtime.update');
        Route::delete('/downtime/{log}', [UnitDowntimeController::class, 'destroy'])->name('downtime.destroy');
    });

    // Admin only
    Route::middleware(['role:admin'])->group(function () {
        Route::delete('/p2h/{session}', [P2hSessionController::class, 'destroy'])->name('p2h.destroy');
    });

    // Admin & Manager
    Route::middleware(['role:admin|manager'])->group(function () {
        Route::resource('units', UnitController::class);
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);

        // Export PDF & Excel
        Route::get('/export/monitoring-pa/pdf',   [DataExportController::class, 'monitoringPaPdf'])->name('export.monitoring-pa.pdf');
        Route::get('/export/monitoring-pa/excel', [DataExportController::class, 'monitoringPaExcel'])->name('export.monitoring-pa.excel');
        Route::get('/export/monitoring-p2h/pdf',  [DataExportController::class, 'monitoringP2hPdf'])->name('export.monitoring-p2h.pdf');
        Route::get('/export/monitoring-p2h/excel',[DataExportController::class, 'monitoringP2hExcel'])->name('export.monitoring-p2h.excel');
    });

    // Export History P2H (semua role bisa, sesuai scope masing-masing)
    Route::get('/export/history-p2h/pdf',   [DataExportController::class, 'historyP2hPdf'])->name('export.history-p2h.pdf');
    Route::get('/export/history-p2h/excel', [DataExportController::class, 'historyP2hExcel'])->name('export.history-p2h.excel');
});

require __DIR__.'/settings.php';
