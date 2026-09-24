<?php

namespace App\Support;

use App\Enums\FindingStatus;
use App\Models\P2hFinding;
use App\Models\P2hSession;
use App\Models\Site;
use App\Models\Unit;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Data laporan P2H periodik (mingguan/bulanan): kepatuhan, temuan, tren,
 * BBM, dan servis. Deterministik — AI hanya merangkum dari data ini.
 */
class PeriodP2hReport
{
    /** @return array{0: Carbon, 1: Carbon} */
    public static function resolvePeriod(string $period, ?string $start = null, ?string $end = null): array
    {
        $today = today();

        return match ($period) {
            'last_week' => [$today->copy()->subWeek()->startOfWeek(), $today->copy()->subWeek()->endOfWeek()->startOfDay()],
            'this_month' => [$today->copy()->startOfMonth(), $today->copy()],
            'last_month' => [$today->copy()->subMonthNoOverflow()->startOfMonth(), $today->copy()->subMonthNoOverflow()->endOfMonth()->startOfDay()],
            'custom' => [Carbon::parse($start ?? $today), Carbon::parse($end ?? $today)],
            default => [$today->copy()->startOfWeek(), $today->copy()],
        };
    }

    public static function build(CarbonInterface $start, CarbonInterface $end, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        $unitScope = fn (Builder $q) => $q
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit));

        P2hFinding::syncMissing($start);

        // ── Kepatuhan pengisian P2H ─────────────────────────────────────────
        $days = (int) $start->diffInDays(min($end, today())) + 1;
        $sessions = P2hSession::query()
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->whereHas('unit', $unitScope)
            ->whereHas('userEntries')
            ->count();
        [$activeUnits, $expected] = self::expectedInspections($start, $end, $unitScope);

        // ── Temuan dalam periode ────────────────────────────────────────────
        $findings = P2hFinding::query()
            ->active()
            ->whereDate('tanggal_temuan', '>=', $start)
            ->whereDate('tanggal_temuan', '<=', $end)
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenisUnit)))
            ->with(['unit:id,no_unit,jenis_unit', 'pic:id,name'])
            ->get();

        // Laporan "Tidak Layak" per unit & item (dalam hari) sepanjang periode
        $unitIds = Unit::withTrashed()->where($unitScope)->pluck('no_unit', 'id');
        // Kunci item dinormalkan (huruf kecil) → tampilkan kembali nama item aslinya
        $itemNames = DB::table('p2h_checklist_answers')
            ->where('kondisi', 'Tidak Layak')
            ->selectRaw('LOWER(TRIM(item_nama)) as item_key, MAX(item_nama) as item_nama')
            ->groupByRaw('LOWER(TRIM(item_nama))')
            ->pluck('item_nama', 'item_key');
        $occurrences = P2hFinding::occurrenceCounts($start, $end)
            ->map(function (int $jumlah, string $key) use ($unitIds, $itemNames) {
                [$unitId, $item] = explode('|', $key, 2);

                return [
                    'unit_id' => (int) $unitId,
                    'no_unit' => $unitIds[$unitId] ?? null,
                    'item' => trim($itemNames[$item] ?? $item),
                    'jumlah' => $jumlah,
                ];
            })
            ->filter(fn ($row) => $row['no_unit'] !== null)
            ->values();

        $closed = $findings->where('status', FindingStatus::Closed);
        $avgClosureDays = $closed->filter(fn ($f) => $f->closed_at)
            ->avg(fn (P2hFinding $f) => $f->tanggal_temuan->diffInDays($f->closed_at->copy()->startOfDay()));
        $threshold = config('p2h.findings.recurring_threshold');

        $overdueNow = P2hFinding::query()
            ->unresolved()
            ->whereDate('target_selesai', '<', today())
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenisUnit)))
            ->with(['unit:id,no_unit', 'pic:id,name'])
            ->orderBy('target_selesai')
            ->get()
            ->map(fn (P2hFinding $f) => [
                'no_unit' => $f->unit?->no_unit,
                'item' => $f->item_nama,
                'pic' => $f->pic?->name,
                'target' => $f->target_selesai->toDateString(),
                'hari_terlambat' => (int) $f->target_selesai->diffInDays(today()),
            ])
            ->all();

        $fuel = UnitUsageAnalytics::fuel($start, $end, $siteId, $jenisUnit);

        return [
            'periode' => [
                'mulai' => $start->toDateString(),
                'selesai' => $end->toDateString(),
                'label' => $start->copy()->locale('id')->translatedFormat('d M Y').' – '.$end->copy()->locale('id')->translatedFormat('d M Y'),
                'jumlah_hari' => $days,
            ],
            'site' => $siteId ? Site::find($siteId)?->name : null,
            'jenis_unit' => $jenisUnit,
            'kepatuhan' => [
                'unit_aktif' => $activeUnits,
                'p2h_masuk' => $sessions,
                'p2h_seharusnya' => $expected,
                'persen' => $expected > 0 ? min(100.0, round($sessions / $expected * 100, 1)) : null,
            ],
            'temuan' => [
                'total' => $findings->count(),
                'kode_aa' => $findings->where('kode_bahaya', 'AA')->count(),
                'closed' => $closed->count(),
                'progress' => $findings->where('status', FindingStatus::Progress)->count(),
                'open' => $findings->where('status', FindingStatus::Open)->count(),
                'rata_rata_hari_penyelesaian' => $avgClosureDays !== null ? round($avgClosureDays, 1) : null,
                'tanpa_pic' => $findings->where('status', '!=', FindingStatus::Closed)->whereNull('pic_user_id')->count(),
            ],
            // Frekuensi = jumlah hari item dilaporkan Tidak Layak (lintas unit) dalam periode
            'item_teratas' => $occurrences
                ->groupBy(fn ($row) => $row['item'])
                ->map(fn ($g, $item) => ['item' => $item, 'jumlah' => $g->sum('jumlah')])
                ->sortByDesc('jumlah')->take(5)->values()->all(),
            'unit_teratas' => $findings->groupBy('unit_id')
                ->map(fn ($g) => [
                    'no_unit' => $g->first()->unit?->no_unit,
                    'jenis_unit' => $g->first()->unit?->jenis_unit,
                    'jumlah' => $g->count(),
                    'belum_selesai' => $g->where('status', '!=', FindingStatus::Closed)->count(),
                ])
                ->sortByDesc('jumlah')->take(5)->values()->all(),
            // Berulang dihitung per hari (beberapa shift di hari yang sama = 1 kali)
            'berulang' => $occurrences
                ->filter(fn ($row) => $row['jumlah'] >= $threshold)
                ->map(fn ($row) => collect($row)->only(['no_unit', 'item', 'jumlah'])->all())
                ->sortByDesc('jumlah')->values()->all(),
            'overdue' => $overdueNow,
            'bbm' => [
                'total_liter' => $fuel['total_liter'],
                'total_jarak' => $fuel['total_jarak'],
                'rata_rata_km_per_liter' => $fuel['rata_rata_jenis'],
                'unit_boros' => collect($fuel['units'])->where('boros', true)
                    ->map(fn ($u) => ['no_unit' => $u['no_unit'], 'km_per_liter' => $u['km_per_liter'], 'rata_rata_jenis' => $u['rata_rata_jenis']])
                    ->values()->all(),
                'jumlah_anomali' => $fuel['jumlah_anomali'],
            ],
            'servis' => collect(UnitUsageAnalytics::serviceForecast($siteId, $jenisUnit))
                ->whereIn('status', ['overdue', 'due_soon'])->values()->all(),
        ];
    }

    /**
     * Jumlah P2H yang seharusnya masuk = total hari-unit, dihitung per unit sesuai
     * masa unit itu benar-benar terdaftar dalam periode (tanggal dibuat s/d dihapus),
     * sehingga unit baru / unit yang dihapus di tengah periode tidak membuat
     * persentase periode lampau meleset.
     *
     * - Unit yang saat ini aktif: dihitung sejak terdaftar sampai akhir periode.
     * - Unit yang sekarang nonaktif/dihapus tetapi sempat P2H di periode ini:
     *   dihitung sampai tanggal dihapus, atau sampai P2H terakhirnya bila tidak diketahui
     *   kapan dinonaktifkan.
     *
     * @return array{0: int, 1: int} [jumlah unit, jumlah P2H seharusnya]
     */
    private static function expectedInspections(CarbonInterface $start, CarbonInterface $end, \Closure $unitScope): array
    {
        $periodEnd = min($end, today())->copy()->startOfDay();

        $activeIds = Unit::active()->where($unitScope)->pluck('id');
        $lastSessionByUnit = P2hSession::query()
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $periodEnd)
            ->whereHas('userEntries')
            ->selectRaw('unit_id, MAX(tanggal) as terakhir')
            ->groupBy('unit_id')
            ->pluck('terakhir', 'unit_id');

        $units = Unit::withTrashed()
            ->where($unitScope)
            ->where(fn ($q) => $q->whereIn('id', $activeIds)->orWhereIn('id', $lastSessionByUnit->keys()))
            ->get(['id', 'created_at', 'deleted_at']);

        $expected = $units->sum(function (Unit $unit) use ($start, $periodEnd, $activeIds, $lastSessionByUnit) {
            $from = max($start->copy()->startOfDay(), $unit->created_at?->copy()->startOfDay() ?? $start->copy()->startOfDay());
            $until = $periodEnd->copy();

            if ($unit->deleted_at) {
                $until = min($until, $unit->deleted_at->copy()->startOfDay()->subDay());
            } elseif (! $activeIds->contains($unit->id)) {
                $until = min($until, Carbon::parse($lastSessionByUnit[$unit->id])->startOfDay());
            }

            return $until->gte($from) ? (int) $from->diffInDays($until) + 1 : 0;
        });

        return [$units->count(), (int) $expected];
    }

    public static function toWhatsApp(array $r, ?string $analysis = null): string
    {
        $scope = collect([$r['jenis_unit'] ?? 'Semua Unit', $r['site'] ? "Site {$r['site']}" : null])->filter()->implode(' · ');
        $k = $r['kepatuhan'];
        $t = $r['temuan'];
        $num = fn ($v) => number_format((float) $v, 0, ',', '.');
        // Huruf bagian berurutan walau ada bagian yang dilewati karena datanya kosong
        $letter = 'A';
        $section = function (string $title) use (&$letter) {
            return '*'.($letter++).". {$title}*";
        };
        $persen = number_format((float) ($k['persen'] ?? 0), 1, ',', '.');

        $lines = [
            '*PERIODIC REPORT P2H*',
            '_Evaluasi Pemeriksaan Harian Kendaraan_',
            "🗓️ {$r['periode']['label']} ({$r['periode']['jumlah_hari']} hari)",
            "🚙 {$scope}",
            '━━━━━━━━━━━━━━━',
            '',
            $section('KEPATUHAN P2H'),
            "• P2H masuk : {$num($k['p2h_masuk'])} dari {$num($k['p2h_seharusnya'])} ({$persen}%)",
            "• Unit aktif : {$k['unit_aktif']} unit",
            '',
            $section('TEMUAN'),
            "• Total temuan : {$t['total']} (kode AA: {$t['kode_aa']})",
            "• 🟢 Closed : {$t['closed']} | 🟡 On Progress : {$t['progress']} | 🔴 Open : {$t['open']}",
            '• Rata-rata penyelesaian : '.($t['rata_rata_hari_penyelesaian'] !== null ? "{$t['rata_rata_hari_penyelesaian']} hari" : '-'),
            "• Belum ada PIC : {$t['tanpa_pic']}",
        ];

        if ($r['item_teratas'] !== []) {
            $lines[] = '';
            $lines[] = $section('ITEM PALING SERING BERMASALAH');
            foreach ($r['item_teratas'] as $i => $row) {
                $lines[] = ($i + 1).". {$row['item']} - {$row['jumlah']}x";
            }
        }

        if ($r['unit_teratas'] !== []) {
            $lines[] = '';
            $lines[] = $section('UNIT DENGAN TEMUAN TERBANYAK');
            foreach ($r['unit_teratas'] as $i => $row) {
                $lines[] = ($i + 1).". *{$row['no_unit']}* - {$row['jumlah']} temuan ({$row['belum_selesai']} belum selesai)";
            }
        }

        if ($r['berulang'] !== [] || $r['overdue'] !== []) {
            $lines[] = '';
            $lines[] = $section('PERLU PERHATIAN');
            foreach ($r['berulang'] as $row) {
                $lines[] = "• 🔁 *{$row['no_unit']}* - {$row['item']} berulang {$row['jumlah']}x";
            }
            foreach ($r['overdue'] as $row) {
                $lines[] = "• ⏰ *{$row['no_unit']}* - {$row['item']} lewat target {$row['hari_terlambat']} hari (PIC: ".($row['pic'] ?: 'Belum ditunjuk').')';
            }
        }

        $b = $r['bbm'];
        $lines[] = '';
        $lines[] = $section('KONSUMSI BBM');
        $lines[] = "• Total BBM : {$num($b['total_liter'])} liter | Jarak : {$num($b['total_jarak'])} km";
        foreach ($b['rata_rata_km_per_liter'] as $jenis => $avg) {
            $lines[] = "• Rata-rata {$jenis} : {$avg} km/liter";
        }
        foreach ($b['unit_boros'] as $row) {
            $lines[] = "• ⚠️ *{$row['no_unit']}* boros: {$row['km_per_liter']} km/l (rata-rata {$row['rata_rata_jenis']})";
        }
        if ($b['jumlah_anomali'] > 0) {
            $lines[] = "• ⚠️ {$b['jumlah_anomali']} pengisian BBM tidak wajar perlu dicek";
        }

        if ($r['servis'] !== []) {
            $lines[] = '';
            $lines[] = $section('JADWAL SERVIS BERKALA');
            foreach ($r['servis'] as $unit) {
                $lines[] = P2hDigestFormatter::serviceLine($unit);
            }
        }

        // Bagian analisis hanya ada bila ditulis oleh AI
        if ($analysis !== null && trim($analysis) !== '') {
            $lines[] = '';
            $lines[] = $section('ANALISIS & REKOMENDASI').' 🤖';
            $lines[] = trim($analysis);
        }

        $lines[] = '';
        $lines[] = '━━━━━━━━━━━━━━━';
        $lines[] = '_PIMS - P2H Management System_';

        return implode("\n", $lines);
    }
}
