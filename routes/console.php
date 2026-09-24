<?php

use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\User;
use App\Notifications\FindingOverdue;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
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

Artisan::command('p2h:merge-duplicate-findings {--dry-run : Tampilkan saja tanpa mengubah data}', function () {
    // Temuan terbuka ganda (unit & item sama) dari sebelum fitur penggabungan ada
    $groups = P2hFinding::query()
        ->unresolved()
        ->orderBy('id')
        ->get()
        ->groupBy(fn (P2hFinding $f) => P2hFinding::recurrenceKey($f->unit_id, $f->item_nama))
        ->filter(fn ($group) => $group->count() > 1);

    $merged = 0;

    foreach ($groups as $group) {
        $target = $group->first(); // temuan tertua jadi induk
        $others = $group->slice(1);
        $this->line("• {$target->unit?->no_unit} — {$target->item_nama}: {$group->count()} temuan → 1");

        if ($this->option('dry-run')) {
            continue;
        }

        DB::transaction(function () use ($target, $others) {
            $latest = $others->sortBy('terakhir_dilaporkan')->last();

            P2hChecklistAnswer::whereIn('p2h_finding_id', $others->pluck('id'))->update(['p2h_finding_id' => $target->id]);

            $target->forceFill([
                'jumlah_laporan' => $target->jumlah_laporan + $others->sum('jumlah_laporan'),
                'terakhir_dilaporkan' => collect([$target, ...$others])->max('terakhir_dilaporkan'),
                'keterangan' => $latest->keterangan ?: $target->keterangan,
                'kode_bahaya' => collect([$target, ...$others])->contains('kode_bahaya', 'AA') ? 'AA' : $target->kode_bahaya,
                // Isian tindak lanjut induk dipertahankan; yang kosong diisi dari temuan lain
                'pic_user_id' => $target->pic_user_id ?? $others->pluck('pic_user_id')->filter()->first(),
                'tindakan_perbaikan' => $target->tindakan_perbaikan ?? $others->pluck('tindakan_perbaikan')->filter()->first(),
                'target_selesai' => $target->target_selesai ?? $others->pluck('target_selesai')->filter()->first(),
            ])->save();

            P2hFinding::whereIn('id', $others->pluck('id'))->delete();
        });

        $merged += $others->count();
    }

    $this->info($this->option('dry-run')
        ? "{$groups->count()} kelompok temuan ganda ditemukan (dry run, tidak ada perubahan)."
        : "{$merged} temuan ganda digabung ke {$groups->count()} temuan.");
})->purpose('Gabungkan temuan terbuka ganda (unit & item sama) menjadi satu temuan');

Artisan::command('p2h:remind-overdue-findings', function () {
    // whereHas (bukan User::role) agar tidak error bila role admin belum dibuat
    $admins = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->get();
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
