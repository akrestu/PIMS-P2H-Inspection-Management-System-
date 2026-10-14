<?php

namespace App\Support;

use App\Models\P2hSession;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Perhitungan PA (Physical Availability) dan status unit — satu sumber untuk
 * halaman Monitoring PA, export, dashboard, dan laporan WA.
 *
 *   T  = jam kalender unit dalam periode (sejak unit terdaftar, maksimal sampai saat ini)
 *   S  = jam downtime (BD / PM / Servis Berkala) dalam periode, termasuk yang masih berjalan
 *   PA = (T − S) / T
 *
 * Semua unit aktif ikut dihitung, termasuk yang tidak P2H. Status unit dibaca
 * pada akhir periode laporan (atau saat ini bila periode mencakup hari ini).
 */
class FleetAvailability
{
    public const PA_TARGET = 80.0;

    /**
     * @param  array{unit_id?: ?int, jenis_unit?: ?string, site_id?: ?int}  $filters
     * @return array{units: Collection<int, array<string, mixed>>, summary: array<string, mixed>}
     */
    public static function build(CarbonInterface $from, CarbonInterface $to, array $filters = [], ?User $viewer = null): array
    {
        $rangeStart = Carbon::parse($from)->startOfDay();
        $asOf = Carbon::parse($to)->endOfDay()->min(now());
        $staffOnly = $viewer?->isStaffOnly() ?? false;

        $units = Unit::active()
            ->orderBy('no_unit')
            ->when($filters['unit_id'] ?? null, fn ($q, $id) => $q->where('id', $id))
            ->when($filters['jenis_unit'] ?? null, fn ($q, $jenis) => $q->where('jenis_unit', $jenis))
            ->when($filters['site_id'] ?? null, fn ($q, $site) => $q->where('site_id', $site))
            ->when($staffOnly, fn ($q) => $q->monitorableBy($viewer))
            ->get();
        $unitIds = $units->pluck('id');

        $sessions = P2hSession::with(['userEntries' => fn ($q) => $q->operational()->with('answers:id,p2h_user_entry_id,kondisi')])
            ->whereIn('unit_id', $unitIds)
            ->whereHas('userEntries', fn ($q) => $q->operational())
            ->whereDate('tanggal', '>=', $rangeStart)
            ->whereDate('tanggal', '<=', $to)
            ->get()
            ->groupBy('unit_id');

        $downtimes = UnitDowntimeLog::whereIn('unit_id', $unitIds)
            ->inRange($rangeStart->toDateString(), Carbon::parse($to)->toDateString())
            ->orderBy('jam_mulai')
            ->get()
            ->groupBy('unit_id');

        $dates = collect(CarbonPeriod::create($rangeStart, Carbon::parse($to)->startOfDay()))->map(fn ($d) => $d->toDateString());

        $rows = $units->map(fn (Unit $unit) => self::unitRow(
            $unit,
            $sessions->get($unit->id, collect()),
            $downtimes->get($unit->id, collect()),
            $dates,
            $rangeStart,
            $asOf,
        ))->values();

        return ['units' => $rows, 'summary' => self::summary($rows)];
    }

    /** @return array<string, mixed> */
    private static function unitRow(Unit $unit, Collection $sessions, Collection $downtimes, Collection $dates, CarbonInterface $rangeStart, CarbonInterface $asOf): array
    {
        // Jam kalender: unit baru dihitung sejak terdaftar
        $start = $unit->created_at && $unit->created_at->greaterThan($rangeStart) ? $unit->created_at : $rangeStart;
        $calendarHours = $asOf->greaterThan($start) ? $start->diffInSeconds($asOf) / 3600 : 0.0;

        $downtimeHours = min($calendarHours, $downtimes->sum(fn (UnitDowntimeLog $log) => self::hoursWithin($log, $start, $asOf)));
        $availableHours = $calendarHours - $downtimeHours;
        $pa = $calendarHours > 0 ? round($availableHours / $calendarHours * 100, 1) : null;

        // Status pada akhir periode: downtime yang sedang berjalan saat itu
        $activeDowntime = $downtimes->first(fn (UnitDowntimeLog $log) => $log->jam_mulai->lessThanOrEqualTo($asOf)
            && ($log->jam_selesai === null || $log->jam_selesai->greaterThan($asOf)));

        $byDate = $sessions->groupBy(fn (P2hSession $s) => $s->tanggal->toDateString());
        $daily = $byDate->map(fn (Collection $daySessions) => $daySessions
            ->flatMap(fn ($s) => $s->userEntries)
            ->contains('kondisi_akhir', 'BD') ? 'bd' : 'operation');

        $timeline = $dates->map(function (string $date) use ($daily, $downtimes) {
            $dayStart = Carbon::parse($date)->startOfDay();
            $dayEnd = Carbon::parse($date)->endOfDay();
            $downtime = $downtimes->first(fn (UnitDowntimeLog $log) => $log->jam_mulai->lessThanOrEqualTo($dayEnd)
                && ($log->jam_selesai === null || $log->jam_selesai->greaterThanOrEqualTo($dayStart)));

            return [
                'date' => $date,
                // Hari tanpa P2H dan tanpa downtime → no_data (P2H tidak dilakukan)
                'status' => $downtime ? 'bd' : ($daily[$date] ?? 'no_data'),
                'has_override' => false,
                'downtime_tipe' => $downtime?->tipe,
            ];
        });

        $latest = $sessions->sortByDesc('tanggal')->first();
        $totalTl = $sessions->flatMap(fn ($s) => $s->userEntries)
            ->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count());

        return [
            'id' => $unit->id,
            'no_unit' => $unit->no_unit,
            'jenis_unit' => $unit->jenis_unit,
            'no_lambung' => $unit->no_lambung,
            'department' => $unit->department,
            'actual_pa' => $pa,
            'calendar_hours' => round($calendarHours, 1),
            'working_hours' => round($availableHours, 1),
            'downtime_hours' => round($downtimeHours, 1),
            'has_time_data' => $calendarHours > 0,
            'current_status' => $activeDowntime ? 'bd' : 'operation',
            'downtime_tipe' => $activeDowntime?->tipe,
            'downtime_since' => $activeDowntime?->jam_mulai->format('Y-m-d H:i'),
            'latest_date' => $latest?->tanggal->toDateString(),
            'total_sessions' => $byDate->count(),
            'total_days' => $dates->count(),
            'operation_days' => $daily->filter(fn ($s) => $s === 'operation')->count(),
            'bd_days' => $timeline->where('status', 'bd')->count(),
            'total_tl' => $totalTl,
            'timeline' => $timeline->values(),
        ];
    }

    private static function hoursWithin(UnitDowntimeLog $log, CarbonInterface $start, CarbonInterface $end): float
    {
        $from = $log->jam_mulai->greaterThan($start) ? $log->jam_mulai : $start;
        $until = $log->jam_selesai === null || $log->jam_selesai->greaterThan($end) ? $end : $log->jam_selesai;

        return $until->greaterThan($from) ? $from->diffInSeconds($until) / 3600 : 0.0;
    }

    /**
     * PA armada = Σ(T − S) / ΣT — tertimbang jam, bukan rata-rata persentase.
     *
     * @return array<string, mixed>
     */
    private static function summary(Collection $rows): array
    {
        $pa = function (Collection $group): ?float {
            $t = $group->sum('calendar_hours');

            return $t > 0 ? round($group->sum('working_hours') / $t * 100, 1) : null;
        };

        return [
            'fleet_actual_pa' => $pa($rows),
            'pa_by_jenis' => $rows->groupBy('jenis_unit')->map(fn ($g) => [
                'pa' => $pa($g),
                'total' => $g->count(),
                'bd' => $g->where('current_status', 'bd')->count(),
            ])->sortKeys()->all(),
            'total_units' => $rows->count(),
            'operation_count' => $rows->where('current_status', 'operation')->count(),
            'bd_count' => $rows->where('current_status', 'bd')->count(),
            'no_data_count' => 0,
            'units_with_time_data' => $rows->where('has_time_data', true)->count(),
            'pa_threshold' => self::PA_TARGET,
        ];
    }
}
