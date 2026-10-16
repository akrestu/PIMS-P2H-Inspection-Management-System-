<?php

namespace App\Support;

use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Monitoring PA per minggu (pims-redesign PA-Desktop.png): PA armada harian 14 hari,
 * grid PA unit × 7 hari, dan jam BD vs PM/Servis. PA = jam tersedia ÷ jam kalender,
 * dihitung oleh FleetAvailability per hari sehingga sama dengan angka periode.
 */
class PaWeekly
{
    public const TARGET = 90;

    /**
     * @param  array{jenis_unit?: string|null}  $filters
     */
    public static function build(CarbonInterface $end, array $filters = [], ?User $viewer = null): array
    {
        $end = Carbon::parse($end)->startOfDay();
        $weekStart = $end->copy()->subDays(6);

        // PA per hari, 14 hari terakhir sampai $end (7 terakhir juga dipakai grid)
        $days = collect(range(13, 0))->map(function (int $ago) use ($end, $filters, $viewer) {
            $day = $end->copy()->subDays($ago);
            $result = FleetAvailability::build($day, $day, $filters, $viewer);

            return [
                'date' => $day->toDateString(),
                'pa' => $result['summary']['fleet_actual_pa'],
                'units' => collect($result['units'])->mapWithKeys(fn ($u) => [$u['id'] => [
                    'pa' => $u['actual_pa'],
                    'downtime' => $u['downtime_hours'],
                ]]),
            ];
        });

        $week = FleetAvailability::build($weekStart, $end, $filters, $viewer);
        $weekDays = $days->slice(7)->values();

        $units = collect($week['units'])
            ->map(fn ($u) => [
                'id' => $u['id'],
                'no_unit' => $u['no_unit'],
                'jenis_unit' => $u['jenis_unit'],
                'avg' => $u['actual_pa'],
                'days' => $weekDays->map(fn ($d) => [
                    'date' => $d['date'],
                    'pa' => $d['units'][$u['id']]['pa'] ?? null,
                    'downtime' => $d['units'][$u['id']]['downtime'] ?? 0,
                ])->values(),
            ])
            ->sortBy(fn ($u) => $u['avg'] ?? 101)
            ->values();

        [$bd, $pm] = self::hoursByType($weekStart, $end, $units->pluck('id')->all());

        return [
            'range' => ['start' => $weekStart->toDateString(), 'end' => $end->toDateString()],
            'summary' => [
                'pa' => $week['summary']['fleet_actual_pa'],
                'jam_bd' => round($bd, 1),
                'jam_pm' => round($pm, 1),
                'di_bawah_target' => $units->filter(fn ($u) => $u['avg'] !== null && $u['avg'] < self::TARGET)->count(),
                'unit' => $units->count(),
                'target' => self::TARGET,
            ],
            'daily' => $days->map(fn ($d) => ['date' => $d['date'], 'pct' => $d['pa']])->values(),
            'units' => $units,
        ];
    }

    /**
     * Jam downtime BD dan PM/Servis dalam rentang, dipotong ke rentang & sejak unit terdaftar.
     *
     * @return array{0: float, 1: float}
     */
    private static function hoursByType(CarbonInterface $start, CarbonInterface $end, array $unitIds): array
    {
        $from = $start->copy()->startOfDay();
        $to = min($end->copy()->endOfDay(), now());
        $created = Unit::whereIn('id', $unitIds)->pluck('created_at', 'id');

        $hours = ['BD' => 0.0, 'other' => 0.0];

        UnitDowntimeLog::whereIn('unit_id', $unitIds)
            ->where('jam_mulai', '<', $to)
            ->where(fn ($q) => $q->whereNull('jam_selesai')->orWhere('jam_selesai', '>', $from))
            ->get(['unit_id', 'tipe', 'jam_mulai', 'jam_selesai'])
            ->each(function (UnitDowntimeLog $log) use ($from, $to, $created, &$hours) {
                $unitFrom = $created[$log->unit_id] ? $from->max($created[$log->unit_id]) : $from;
                $begin = $log->jam_mulai->max($unitFrom);
                $finish = ($log->jam_selesai ?? $to)->min($to);

                if ($finish->greaterThan($begin)) {
                    $hours[$log->tipe === 'BD' ? 'BD' : 'other'] += $begin->diffInSeconds($finish) / 3600;
                }
            });

        return [$hours['BD'], $hours['other']];
    }
}
