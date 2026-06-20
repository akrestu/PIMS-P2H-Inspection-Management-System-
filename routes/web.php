<?php

use App\Http\Controllers\AppSettingController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DataExportController;
use App\Http\Controllers\DriverDashboardController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\P2hApprovalController;
use App\Http\Controllers\P2hComplianceController;
use App\Http\Controllers\P2hExportController;
use App\Http\Controllers\P2hSessionController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitDowntimeController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Root redirect: role-aware
Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    $user = auth()->user();

    if ($user->hasRole('driver')) {
        return redirect()->route('driver.dashboard');
    }

    if ($user->hasAnyRole(['admin', 'manager'])) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login')->withErrors([
        'nik' => 'Akun Anda belum memiliki role yang valid. Hubungi administrator.',
    ]);
})->name('home');

Route::middleware(['auth'])->group(function () {
    // Dashboard — admin & manager only; driver diarahkan ke /driver/dashboard
    Route::get('/dashboard', function () {
        if (auth()->user()->hasRole('driver')) {
            return redirect()->route('driver.dashboard');
        }
        return app(DashboardController::class)->index(request());
    })->middleware('role:admin|manager|driver')->name('dashboard');

    // Driver Dashboard
    Route::get('/driver/dashboard', [DriverDashboardController::class, 'index'])
        ->middleware('role:driver')
        ->name('driver.dashboard');

    // P2H
    Route::get('/p2h', [P2hSessionController::class, 'index'])->name('p2h.index');
    Route::get('/p2h/form', [P2hSessionController::class, 'create'])->name('p2h.create');
    Route::post('/p2h', [P2hSessionController::class, 'store'])->name('p2h.store');

    // AJAX — cek slot unit hari ini
    Route::get('/api/p2h/check-slot', [P2hSessionController::class, 'checkSlot'])->name('p2h.check-slot');

    // P2H Approval (Staff/Sr.Staff + Admin/Manager) — must be before /{session} to avoid conflict
    Route::get('/p2h/approvals', [P2hApprovalController::class, 'index'])->name('p2h.approvals');
    Route::get('/p2h/entries/{entry}/detail', [P2hApprovalController::class, 'detail'])->name('p2h.entry.detail');
    Route::patch('/p2h/entries/{entry}/approve', [P2hApprovalController::class, 'approve'])->name('p2h.approve');
    Route::patch('/p2h/entries/{entry}/reject', [P2hApprovalController::class, 'reject'])->name('p2h.reject');

    Route::get('/p2h/{session}', [P2hSessionController::class, 'show'])->name('p2h.show');
    Route::get('/p2h/{session}/export-pdf', [P2hExportController::class, 'exportPdf'])->name('p2h.export-pdf');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications', [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');

    // Monitoring P2H — admin, manager, dan driver staff/sr.staff (data dibatasi di controller)
    Route::get('/monitoring', [MonitoringController::class, 'index'])
        ->middleware(['role:admin|manager|driver'])
        ->name('monitoring.index');

    // Monitoring P2H — admin, manager, dan driver dengan jabatan Staff/Sr.Staff
    Route::get('/p2h-compliance', [P2hComplianceController::class, 'index'])
        ->middleware(['role:admin|manager|driver'])
        ->name('p2h.compliance');

    // Downtime Log — admin & manager
    Route::middleware(['role:admin|manager'])->group(function () {
        Route::get('/downtime', [UnitDowntimeController::class, 'index'])->name('downtime.index');
        Route::post('/downtime', [UnitDowntimeController::class, 'store'])->name('downtime.store');
        Route::patch('/downtime/{log}', [UnitDowntimeController::class, 'update'])->name('downtime.update');
        Route::delete('/downtime/{log}', [UnitDowntimeController::class, 'destroy'])->name('downtime.destroy');
    });

    // Admin only
    Route::middleware(['role:admin'])->group(function () {
        Route::delete('/p2h/{session}', [P2hSessionController::class, 'destroy'])->name('p2h.destroy');
        Route::delete('/p2h/{session}/entries/{entry}', [P2hSessionController::class, 'destroyEntry'])->name('p2h.entries.destroy');
        Route::get('/audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
        Route::get('/app-settings', [AppSettingController::class, 'index'])->name('app-settings.index');
        Route::post('/app-settings', [AppSettingController::class, 'update'])->name('app-settings.update');
    });

    // Admin & Manager
    Route::middleware(['role:admin|manager'])->group(function () {
        Route::get('/units/export', [UnitController::class, 'export'])->name('units.export');
        Route::get('/units/import-template', [UnitController::class, 'importTemplate'])->name('units.import-template');
        Route::post('/units/import', [UnitController::class, 'import'])->middleware('throttle:5,1')->name('units.import');
        Route::delete('/units/batch', [UnitController::class, 'destroyBatch'])->name('units.batch-destroy');
        Route::resource('units', UnitController::class)->except(['show']);

        Route::delete('/users/batch', [UserController::class, 'destroyBatch'])->name('users.batch-destroy');
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('/users/export', [UserController::class, 'export'])->name('users.export');
        Route::get('/users/import-template', [UserController::class, 'importTemplate'])->name('users.import-template');
        Route::post('/users/import', [UserController::class, 'import'])->middleware('throttle:5,1')->name('users.import');

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
