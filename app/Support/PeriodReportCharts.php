<?php

namespace App\Support;

use App\Enums\FindingStatus;
use App\Models\P2hFinding;
use App\Models\P2hSession;
use App\Models\Site;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;

/**
 * Data tambahan untuk tampilan Laporan periode (pims-redesign LaporanPeriode-Desktop.png):
 * KPI + perbandingan periode sebelumnya, kepatuhan harian, temuan per minggu, dan
 * ringkasan per site. Hanya membaca data; angka kepatuhan & PA memakai rumus yang
 * sama dengan PeriodP2hReport dan FleetAvailability.
 */
class PeriodReportCharts
{
    public static function build(CarbonInterface $start, CarbonInterface $end, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        $current = self::totals($start, $end, $siteId, $jenisUnit);

        // Periode sebelumnya dengan panjang yang sama, tepat sebelum $start
        $length = (int) $start->diffInDays($end) + 1;
        $prevEnd = $start->copy()->subDay();
        $prevStart = $prevEnd->copy()->subDays($length - 1);

        return [
            'totals' => $current,
            'previous' => self::totals($prevStart, $prevEnd, $siteId, $jenisUnit),
            'daily' => self::daily($start, $end, $siteId, $jenisUnit),
            'weekly' => self::weekly($start, $end, $siteId, $jenisUnit),
            'sites' => $siteId ? [] : self::sites($start, $end, $jenisUnit),
        ];
    }

    /** @return array{kepatuhan: float|null, p2h: int, wajib: int, tidak_layak: int, temuan: int, temuan_closed: int, temuan_open: int, pa: float|null, downtime_jam: float, bd_persen: float|null} */
    private static function totals(CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit): array
    {
        $report = PeriodP2hReport::build($start, $end, $siteId, $jenisUnit);
        $availability = FleetAvailability::build($start, min($end, today()), ['site_id' => $siteId, 'jenis_unit' => $jenisUnit]);
        $units = collect($availability['units']);

        $downtime = (float) $units->sum('downtime_hours');
        $bdHours = self::bdHours($start, $end, $units->pluck('id')->all());

        return [
            'kepatuhan' => $report['kepatuhan']['persen'],
            'p2h' => $report['kepatuhan']['p2h_masuk'],
            'wajib' => $report['kepatuhan']['p2h_seharusnya'],
            'tidak_layak' => self::sessions($start, $end, $siteId, $jenisUnit)
                ->whereHas('userEntries', fn ($q) => $q->notRejected()->where('kondisi_akhir', 'BD'))
                ->count(),
            'temuan' => $report['temuan']['total'],
            'temuan_closed' => $report['temuan']['closed'],
            'temuan_open' => $report['temuan']['open'] + $report['temuan']['progress'],
            'pa' => $availability['summary']['fleet_actual_pa'],
            'downtime_jam' => round($downtime, 1),
            'bd_persen' => $downtime > 0 ? round($bdHours / $downtime * 100, 1) : null,
        ];
    }

    /** Kepatuhan per hari: unit dengan P2H (tidak ditolak) ÷ unit aktif dalam cakupan. */
    private static function daily(CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit): array
    {
        $last = min($end, today());
        $total = self::units($siteId, $jenisUnit)->count();

        $filled = self::sessions($start, $last, $siteId, $jenisUnit)
            ->whereHas('userEntries', fn ($q) => $q->notRejected())
            ->selectRaw('date(tanggal) as d, count(distinct unit_id) as n')
            ->groupBy('d')
            ->pluck('n', 'd');

        return collect(CarbonPeriod::create($start, $last))
            ->map(fn (CarbonInterface $d) => [
                'date' => $d->toDateString(),
                'pct' => $total > 0 ? round(min(100, ($filled[$d->toDateString()] ?? 0) / $total * 100), 1) : null,
            ])
            ->values()
            ->all();
    }

    /** Temuan dibuka (tanggal temuan) dan ditutup (closed_at) per minggu ISO. */
    private static function weekly(CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit): array
    {
        $scope = fn ($q) => $q->active()
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenisUnit)));

        $opened = P2hFinding::query()->where($scope)
            ->whereDate('tanggal_temuan', '>=', $start)->whereDate('tanggal_temuan', '<=', $end)
            ->pluck('tanggal_temuan')
            ->countBy(fn ($d) => Carbon::parse($d)->isoWeek());

        $closed = P2hFinding::query()->where($scope)
            ->where('status', FindingStatus::Closed->value)
            ->whereDate('closed_at', '>=', $start)->whereDate('closed_at', '<=', $end)
            ->pluck('closed_at')
            ->countBy(fn ($d) => Carbon::parse($d)->isoWeek());

        $weeks = [];
        for ($d = $start->copy()->startOfWeek(); $d->lte($end); $d = $d->copy()->addWeek()) {
            $w = $d->isoWeek();
            $weeks[] = ['label' => "Minggu {$w}", 'dibuka' => $opened[$w] ?? 0, 'ditutup' => $closed[$w] ?? 0];
        }

        return $weeks;
    }

    private static function sites(CarbonInterface $start, CarbonInterface $end, ?string $jenisUnit): array
    {
        return Site::active()->orderBy('name')->get(['id', 'name'])
            ->map(function (Site $site) use ($start, $end, $jenisUnit) {
                if (! self::units($site->id, $jenisUnit)->exists()) {
                    return null;
                }

                $t = self::totals($start, $end, $site->id, $jenisUnit);

                return [
                    'name' => $site->name,
                    'kepatuhan' => $t['kepatuhan'],
                    'p2h' => $t['p2h'],
                    'tidak_layak' => $t['tidak_layak'],
                    'pa' => $t['pa'],
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private static function units(?int $siteId, ?string $jenisUnit)
    {
        return Unit::active()
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit));
    }

    private static function sessions(CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit)
    {
        return P2hSession::query()
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->whereHas('unit', fn ($q) => $q
                ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
                ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit)));
    }

    /**
     * Jam BD (bukan PM/Servis) dalam periode, dipotong ke batas periode dan ke
     * tanggal unit didaftarkan — sama dengan jam kalender di FleetAvailability.
     */
    private static function bdHours(CarbonInterface $start, CarbonInterface $end, array $unitIds): float
    {
        $from = $start->copy()->startOfDay();
        $to = min($end->copy()->endOfDay(), now());
        $created = Unit::whereIn('id', $unitIds)->pluck('created_at', 'id');

        return UnitDowntimeLog::whereIn('unit_id', $unitIds)
            ->where('tipe', 'BD')
            ->where('jam_mulai', '<', $to)
            ->where(fn ($q) => $q->whereNull('jam_selesai')->orWhere('jam_selesai', '>', $from))
            ->get(['unit_id', 'jam_mulai', 'jam_selesai'])
            ->sum(function (UnitDowntimeLog $log) use ($from, $to, $created) {
                $unitFrom = $created[$log->unit_id] ? $from->max($created[$log->unit_id]) : $from;
                $begin = $log->jam_mulai->max($unitFrom);
                $finish = ($log->jam_selesai ?? $to)->min($to);

                return $finish->greaterThan($begin) ? $begin->diffInSeconds($finish) / 3600 : 0;
            });
    }
}
