<?php

namespace App\Http\Controllers;

use App\Models\P2hSession;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    /** Threshold kelayakan P2H: sesi dianggap "Operation" jika score >= ini (fallback saat kondisi_akhir null) */
    private const PA_THRESHOLD = 80.0;

    /** Durasi 1 shift dalam jam (Shift I: 06:00–18:00, Shift II: 18:00–06:00) */
    private const SHIFT_HOURS = 12.0;

    public function index(Request $request): Response
    {
        $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to'   => 'nullable|date_format:Y-m-d',
            'unit_id'   => 'nullable|integer|exists:units,id',
            'jenis_unit'=> 'nullable|in:Bus,Light Vehicle',
        ]);

        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to', now()->toDateString());
        $unitId   = $request->input('unit_id');
        $jenis    = $request->input('jenis_unit');

        // Clamp max range ke 90 hari
        $from = Carbon::parse($dateFrom);
        $to   = Carbon::parse($dateTo);
        if ($from->diffInDays($to) > 90) {
            $from     = $to->copy()->subDays(89);
            $dateFrom = $from->toDateString();
        }

        // ── Semua unit aktif ──────────────────────────────────────────────────
        $unitQuery = Unit::active()->orderBy('no_unit');
        if ($unitId) {
            $unitQuery->where('id', $unitId);
        }
        if ($jenis) {
            $unitQuery->where('jenis_unit', $jenis);
        }
        $units = $unitQuery->get();

        // ── Semua sesi dalam range ────────────────────────────────────────────
        $sessions = P2hSession::with(['unit', 'userEntries.answers'])
            ->whereBetween('tanggal', [$dateFrom, $dateTo])
            ->when($unitId, fn ($q) => $q->where('unit_id', $unitId))
            ->when($jenis, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenis)))
            ->get()
            ->groupBy('unit_id');

        // ── Hitung PA per unit ────────────────────────────────────────────────
        $unitData = $units->map(function (Unit $unit) use ($sessions, $from, $to, $dateFrom, $dateTo) {
            $unitSessions = $sessions->get($unit->id, collect());

            // Group sesi per tanggal
            $sessionsByDate = $unitSessions->groupBy(fn ($s) => $s->tanggal->toDateString());

            $totalDaysWithSession = $sessionsByDate->count();
            $totalDays            = $from->diffInDays($to) + 1;

            // ── Daily status + compliance score ──────────────────────────────
            $dailyData = $sessionsByDate->map(function (Collection $daySessions) {
                // Compliance score: ambil sesi terbaik pada hari itu
                $bestScore = $daySessions->map(function ($session) {
                    $totalAnswers = 0;
                    $layakAnswers = 0;
                    foreach ($session->userEntries as $entry) {
                        foreach ($entry->answers as $ans) {
                            $totalAnswers++;
                            if ($ans->kondisi === 'Layak') {
                                $layakAnswers++;
                            }
                        }
                    }
                    return $totalAnswers > 0 ? round(($layakAnswers / $totalAnswers) * 100, 1) : null;
                })->filter()->max();

                // kondisi_akhir override: ambil dari semua entries hari itu
                $kondisiEntries = $daySessions
                    ->flatMap(fn ($s) => $s->userEntries)
                    ->pluck('kondisi_akhir')
                    ->filter()
                    ->values();

                // Override ada jika ada entry dengan kondisi_akhir yang berbeda dari rekomendasi kalkulasi
                $hasOverride = $daySessions->flatMap(fn ($s) => $s->userEntries)
                    ->contains(fn ($e) => $e->is_override);

                // Tentukan status efektif:
                // 1. Jika ada satu entry kondisi_akhir='BD' → BD
                // 2. Jika semua entry punya kondisi_akhir='Layak Pakai' → Operation
                // 3. Fallback ke compliance score
                if ($kondisiEntries->contains('BD')) {
                    $effectiveStatus = 'bd';
                } elseif ($kondisiEntries->isNotEmpty() && !$kondisiEntries->contains('BD')) {
                    $effectiveStatus = 'operation';
                } elseif ($bestScore !== null) {
                    $effectiveStatus = $bestScore >= self::PA_THRESHOLD ? 'operation' : 'bd';
                } else {
                    $effectiveStatus = 'no_data';
                }

                return [
                    'compliance_score' => $bestScore,
                    'effective_status' => $effectiveStatus,
                    'has_override'     => $hasOverride,
                ];
            });

            $operationDays  = $dailyData->where('effective_status', 'operation')->count();
            $bdDays         = $dailyData->where('effective_status', 'bd')->count();

            // Compliance PA (formula lama: berbasis score checklist)
            $compliancePa = $totalDaysWithSession > 0
                ? round(($operationDays / $totalDaysWithSession) * 100, 1)
                : null;

            // ── PA Aktual: W / (W + S) ────────────────────────────────────────
            $workingHours  = $this->calculateWorkingHours($unitSessions);
            $downtimeHours = $this->calculateDowntimeHours($unit->id, $dateFrom, $dateTo);
            $actualPa = null;
            if (($workingHours + $downtimeHours) > 0) {
                $raw      = $workingHours / ($workingHours + $downtimeHours) * 100;
                $actualPa = round(min(100.0, max(0.0, $raw)), 1);
            }

            // ── Status saat ini (dari sesi terbaru) ───────────────────────────
            $latestSession = $unitSessions->sortByDesc('tanggal')->first();
            $currentScore  = null;
            $currentStatus = 'no_data';

            if ($latestSession) {
                $kondisiEntries = $latestSession->userEntries->pluck('kondisi_akhir')->filter()->values();

                if ($kondisiEntries->contains('BD')) {
                    $currentStatus = 'bd';
                } elseif ($kondisiEntries->isNotEmpty()) {
                    $currentStatus = 'operation';
                } else {
                    // Fallback ke score
                    $totalAnswers = 0;
                    $layakAnswers = 0;
                    foreach ($latestSession->userEntries as $entry) {
                        foreach ($entry->answers as $ans) {
                            $totalAnswers++;
                            if ($ans->kondisi === 'Layak') {
                                $layakAnswers++;
                            }
                        }
                    }
                    if ($totalAnswers > 0) {
                        $currentScore  = round(($layakAnswers / $totalAnswers) * 100, 1);
                        $currentStatus = $currentScore >= self::PA_THRESHOLD ? 'operation' : 'bd';
                    }
                }
            }

            // ── Timeline sparkline ────────────────────────────────────────────
            $timeline = collect();
            $cursor   = $from->copy();
            while ($cursor->lte($to)) {
                $dateStr = $cursor->toDateString();
                $day     = $dailyData->get($dateStr);
                $timeline->push([
                    'date'         => $dateStr,
                    'score'        => $day['compliance_score'] ?? null,
                    'status'       => $day['effective_status'] ?? 'no_data',
                    'has_override' => $day['has_override'] ?? false,
                ]);
                $cursor->addDay();
            }

            // Total TL dalam range
            $totalTL = 0;
            foreach ($unitSessions as $session) {
                foreach ($session->userEntries as $entry) {
                    $totalTL += $entry->answers->where('kondisi', 'Tidak Layak')->count();
                }
            }

            return [
                'id'             => $unit->id,
                'no_unit'        => $unit->no_unit,
                'jenis_unit'     => $unit->jenis_unit,
                'no_lambung'     => $unit->no_lambung,
                'compliance_pa'  => $compliancePa,
                'actual_pa'      => $actualPa,
                'working_hours'  => round($workingHours, 1),
                'downtime_hours' => round($downtimeHours, 1),
                'has_time_data'  => $workingHours > 0,
                'current_score'  => $currentScore,
                'current_status' => $currentStatus,
                'latest_date'    => $latestSession?->tanggal->toDateString(),
                'total_sessions' => $totalDaysWithSession,
                'total_days'     => $totalDays,
                'operation_days' => $operationDays,
                'bd_days'        => $bdDays,
                'total_tl'       => $totalTL,
                'timeline'       => $timeline->values(),
            ];
        })->values();

        // ── Fleet summary ─────────────────────────────────────────────────────
        $withCompliance  = $unitData->filter(fn ($u) => $u['compliance_pa'] !== null);
        $withActual      = $unitData->filter(fn ($u) => $u['actual_pa'] !== null);

        $fleetCompliancePa = $withCompliance->count() > 0
            ? round($withCompliance->avg('compliance_pa'), 1)
            : null;

        $fleetActualPa = $withActual->count() > 0
            ? round($withActual->avg('actual_pa'), 1)
            : null;

        $summary = [
            'fleet_compliance_pa'   => $fleetCompliancePa,
            'fleet_actual_pa'       => $fleetActualPa,
            'total_units'           => $units->count(),
            'operation_count'       => $unitData->where('current_status', 'operation')->count(),
            'bd_count'              => $unitData->where('current_status', 'bd')->count(),
            'no_data_count'         => $unitData->where('current_status', 'no_data')->count(),
            'units_with_time_data'  => $unitData->where('has_time_data', true)->count(),
            'pa_threshold'          => self::PA_THRESHOLD,
            'shift_hours'           => self::SHIFT_HOURS,
        ];

        $allUnits = Unit::active()->orderBy('no_unit')->get(['id', 'no_unit', 'jenis_unit']);

        return Inertia::render('monitoring/index', [
            'unitData' => $unitData,
            'summary'  => $summary,
            'filters'  => [
                'date_from'  => $dateFrom,
                'date_to'    => $dateTo,
                'unit_id'    => $unitId,
                'jenis_unit' => $jenis,
            ],
            'allUnits' => $allUnits,
        ]);
    }

    /**
     * W = jumlah shift entries × SHIFT_HOURS (12 jam per shift).
     */
    private function calculateWorkingHours(Collection $unitSessions): float
    {
        $shiftCount = 0;
        foreach ($unitSessions as $session) {
            $shiftCount += $session->userEntries->count();
        }
        return $shiftCount * self::SHIFT_HOURS;
    }

    /**
     * S = total jam downtime logs yang selesai dan overlap dengan range.
     */
    private function calculateDowntimeHours(int $unitId, string $from, string $to): float
    {
        return UnitDowntimeLog::where('unit_id', $unitId)
            ->completed()
            ->inRange($from, $to)
            ->get()
            ->sum(fn ($log) => $log->duration_hours ?? 0.0);
    }
}
