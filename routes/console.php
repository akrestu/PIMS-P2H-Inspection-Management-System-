<?php

use App\Models\P2hFinding;
use App\Models\User;
use App\Notifications\FindingOverdue;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('p2h:backfill-findings {--days= : Batasi ke N hari terakhir (default: semua data)}', function () {
    $since = $this->option('days') ? today()->subDays((int) $this->option('days')) : null;
    $created = P2hFinding::syncMissing($since);

    $this->info("{$created} temuan dibuat dari data P2H ".($since ? "sejak {$since->toDateString()}." : '(semua data).'));
})->purpose('Buat data temuan P2H dari jawaban checklist Tidak Layak yang belum tercatat');

Artisan::command('p2h:remind-overdue-findings', function () {
    $admins = User::role('admin')->get();
    $sent = 0;

    // Satu pengingat per temuan per hari: PIC-nya, atau admin bila PIC belum ditunjuk
    P2hFinding::query()
        ->unresolved()
        ->whereNotNull('target_selesai')
        ->whereDate('target_selesai', '<', today())
        ->where(fn ($q) => $q->whereNull('overdue_notified_at')->orWhereDate('overdue_notified_at', '<', today()))
        ->with(['unit:id,no_unit', 'pic'])
        ->chunkById(100, function ($findings) use ($admins, &$sent) {
            foreach ($findings as $finding) {
                Notification::send($finding->pic ? [$finding->pic] : $admins, new FindingOverdue($finding));
                $finding->forceFill(['overdue_notified_at' => now()])->saveQuietly();
                $sent++;
            }
        });

    $this->info("{$sent} pengingat temuan lewat target dikirim.");
})->purpose('Kirim notifikasi pengingat untuk temuan P2H yang melewati target selesai');

Schedule::command('p2h:remind-overdue-findings')->dailyAt(config('p2h.findings.overdue_reminder_time'));
