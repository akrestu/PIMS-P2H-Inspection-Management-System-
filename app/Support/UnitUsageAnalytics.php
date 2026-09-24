<?php

namespace App\Support;

use App\Models\P2hUserEntry;
use App\Models\Unit;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Analitik pemakaian unit dari data P2H: pembacaan KM/HM harian, fuel log,
 * dan centang "Servis Berkala". Semua angka dihitung deterministik di sini.
 */
class UnitUsageAnalytics
{
    /**
     * Rasio KM/liter per unit, penanda unit boros, dan pengisian BBM tidak wajar.
     */
    public static function fuel(CarbonInterface $start, CarbonInterface $end, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        $entries = self::entries($start, $end, $siteId, $jenisUnit, withFuel: true);

        $units = $entries->groupBy(fn (P2hUserEntry $e) => $e->session->unit_id)->map(function (Collection $unitEntries) {
            $unit = $unitEntries->first()->session->unit;
            $series = self::cleanSeries($unitEntries);
            $distance = $series->count() >= 2 ? $series->last() - $series->first() : 0;
            $liters = (float) $unitEntries->sum(fn (P2hUserEntry $e) => (float) ($e->fuelLog?->jumlah_liter ?? 0));

            return [
                'unit_id' => $unit->id,
                'no_unit' => $unit->no_unit,
                'jenis_unit' => $unit->jenis_unit,
                'jarak' => $distance,
                'liter' => round($liters, 2),
                'jumlah_isi' => $unitEntries->filter(fn ($e) => (float) ($e->fuelLog?->jumlah_liter ?? 0) > 0)->count(),
                'km_per_liter' => $liters > 0 && $distance > 0 ? round($distance / $liters, 2) : null,
                'anomali' => self::fillAnomalies($unitEntries),
            ];
        });

        // Rata-rata armada per jenis unit sebagai pembanding "boros"
        $averages = $units->whereNotNull('km_per_liter')->groupBy('jenis_unit')
            ->map(fn (Collection $g) => round($g->avg('km_per_liter'), 2));
        $ratio = config('p2h.fuel.wasteful_ratio');

        $units = $units->map(function (array $u) use ($averages, $ratio) {
            $avg = $averages[$u['jenis_unit']] ?? null;

            return [
                ...$u,
                'rata_rata_jenis' => $avg,
                'boros' => $u['km_per_liter'] !== null && $avg && $u['km_per_liter'] < $avg * $ratio,
            ];
        })->sortBy([['boros', 'desc'], ['no_unit', 'asc']])->values();

        return [
            'units' => $units->all(),
            'total_liter' => round($units->sum('liter'), 2),
            'total_jarak' => $units->sum('jarak'),
            'rata_rata_jenis' => $averages->all(),
            'unit_boros' => $units->where('boros', true)->count(),
            'jumlah_anomali' => $units->sum(fn ($u) => count($u['anomali'])),
        ];
    }

    /**
     * Prediksi servis berkala per unit aktif: KM saat ini, KM servis terakhir,
     * sisa jarak ke servis berikutnya, dan estimasi hari berdasarkan pemakaian 30 hari.
     */
    public static function serviceForecast(?int $siteId = null, ?string $jenisUnit = null, ?CarbonInterface $asOf = null): array
    {
        $asOf ??= today();
        $entries = self::entries($asOf->copy()->subDays(365), $asOf, $siteId, $jenisUnit, withFuel: true, withService: true);
        $byUnit = $entries->groupBy(fn (P2hUserEntry $e) => $e->session->unit_id);
        $dueSoon = config('p2h.service.due_soon_km');

        return Unit::active()
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit))
            ->orderBy('no_unit')
            ->get()
            ->map(function (Unit $unit) use ($byUnit, $asOf, $dueSoon) {
                $unitEntries = $byUnit->get($unit->id, collect());
                $series = self::cleanSeries($unitEntries);
                $current = $series->last();
                $serviceEntries = $unitEntries->filter(fn ($e) => $e->session->serviceInfo?->servis_berkala);
                // Hanya pembacaan sah (bukan salah ketik) yang dipakai sebagai KM servis terakhir
                $lastServiceKm = $serviceEntries->flatMap(fn ($e) => self::readings($e))
                    ->filter(fn ($km) => $series->contains($km))
                    ->max();
                $lastServiceDate = $serviceEntries->max(fn ($e) => $e->session->tanggal)?->toDateString();
                $interval = config("p2h.service.interval_km.{$unit->jenis_unit}", config('p2h.service.default_interval_km'));

                // Pemakaian harian rata-rata 30 hari terakhir → estimasi hari menuju servis
                $recent = $unitEntries->filter(fn ($e) => $e->session->tanggal->gte($asOf->copy()->subDays(30)));
                $recentSeries = self::cleanSeries($recent);
                $recentDays = $recent->isEmpty() ? 0 : max(1, (int) $recent->min(fn ($e) => $e->session->tanggal)->diffInDays($asOf));
                $dailyKm = $recentSeries->count() >= 2 && $recentDays > 0
                    ? ($recentSeries->last() - $recentSeries->first()) / $recentDays
                    : null;

                $remaining = $current !== null && $lastServiceKm !== null ? ($lastServiceKm + $interval) - $current : null;

                return [
                    'unit_id' => $unit->id,
                    'no_unit' => $unit->no_unit,
                    'jenis_unit' => $unit->jenis_unit,
                    'km_saat_ini' => $current,
                    'km_servis_terakhir' => $lastServiceKm,
                    'tanggal_servis_terakhir' => $lastServiceDate,
                    'interval' => $interval,
                    'km_servis_berikutnya' => $lastServiceKm !== null ? $lastServiceKm + $interval : null,
                    'sisa_km' => $remaining,
                    'estimasi_hari' => $remaining !== null && $remaining > 0 && $dailyKm ? (int) ceil($remaining / $dailyKm) : null,
                    'status' => match (true) {
                        $remaining === null => 'unknown',
                        $remaining <= 0 => 'overdue',
                        $remaining <= $dueSoon => 'due_soon',
                        default => 'ok',
                    },
                ];
            })
            ->sortBy(fn ($u) => [
                ['overdue' => 0, 'due_soon' => 1, 'ok' => 2, 'unknown' => 3][$u['status']],
                $u['sisa_km'] ?? PHP_INT_MAX,
            ])
            ->values()
            ->all();
    }

    /** @return Collection<int, P2hUserEntry> */
    private static function entries(CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit, bool $withFuel = false, bool $withService = false): Collection
    {
        return P2hUserEntry::query()
            ->whereHas('session', fn (Builder $s) => $s
                ->whereDate('tanggal', '>=', $start)
                ->whereDate('tanggal', '<=', $end)
                ->whereHas('unit', fn (Builder $u) => $u
                    ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
                    ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit))))
            ->with(array_filter([
                'session:id,unit_id,tanggal',
                'session.unit:id,no_unit,jenis_unit,site_id',
                $withFuel ? 'fuelLog' : null,
                $withService ? 'session.serviceInfo' : null,
            ]))
            ->orderBy('submitted_at')
            ->get(['id', 'p2h_session_id', 'km_awal', 'hm_km_akhir', 'submitted_at']);
    }

    /**
     * Deret pembacaan KM/HM kronologis yang sudah dibersihkan dari salah ketik:
     * pembacaan yang mundur atau melonjak melebihi batas wajar dari pembacaan
     * sah sebelumnya diabaikan.
     */
    private static function cleanSeries(Collection $entries): Collection
    {
        $maxJump = config('p2h.fuel.max_km_jump');
        $readings = $entries->flatMap(fn (P2hUserEntry $e) => self::readings($e));
        $accepted = collect();

        // Titik awal tidak boleh pencilan tinggi: mulai dari pembacaan pertama ≤ median
        $median = $readings->median();

        foreach ($readings as $km) {
            $last = $accepted->last();

            if ($last === null ? $km <= $median : ($km >= $last && $km - $last <= $maxJump)) {
                $accepted->push($km);
            }
        }

        return $accepted;
    }

    /** Semua pembacaan KM/HM yang valid dari satu entry. */
    private static function readings(P2hUserEntry $entry): Collection
    {
        return collect([$entry->km_awal, $entry->hm_km_akhir, $entry->fuelLog?->km_unit])
            ->filter(fn ($v) => $v !== null && (int) $v > 0)
            ->map(fn ($v) => (int) $v)
            ->values();
    }

    /** Pengisian BBM besar yang jaraknya terlalu dekat dengan pengisian sebelumnya. */
    private static function fillAnomalies(Collection $unitEntries): array
    {
        $minKm = config('p2h.fuel.min_km_between_fills');
        $minLiters = config('p2h.fuel.min_liters_flag');
        $previousKm = null;
        $anomalies = [];

        foreach ($unitEntries as $entry) {
            $liters = (float) ($entry->fuelLog?->jumlah_liter ?? 0);
            $km = $entry->fuelLog?->km_unit ?: $entry->km_awal;

            if ($liters <= 0 || ! $km) {
                continue;
            }

            if ($previousKm !== null && $liters >= $minLiters && ($km - $previousKm) < $minKm) {
                $anomalies[] = [
                    'tanggal' => $entry->session->tanggal->toDateString(),
                    'liter' => $liters,
                    'jarak_sejak_isi_sebelumnya' => $km - $previousKm,
                ];
            }

            $previousKm = $km;
        }

        return $anomalies;
    }
}
