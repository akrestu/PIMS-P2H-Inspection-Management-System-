<?php

namespace App\Http\Controllers;

use App\Exports\HistoryP2hExport;
use App\Exports\MonitoringP2hExport;
use App\Exports\MonitoringPaExport;
use App\Models\P2hSession;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Facades\Excel;

class DataExportController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Monitoring PA
    // ─────────────────────────────────────────────────────────────────────────

    public function monitoringPaPdf(Request $request): Response
    {
        [$unitData, $summary, $dateFrom, $dateTo] = $this->buildMonitoringPaData($request);

        $pdf = Pdf::loadView('exports.monitoring-pa', compact('unitData', 'summary', 'dateFrom', 'dateTo'))
            ->setPaper('a4', 'landscape');

        $filename = 'monitoring-pa_' . $dateFrom . '_' . $dateTo . '.pdf';

        return $pdf->download($filename);
    }

    public function monitoringPaExcel(Request $request)
    {
        [$unitData, $summary, $dateFrom, $dateTo] = $this->buildMonitoringPaData($request);

        $filename = 'monitoring-pa_' . $dateFrom . '_' . $dateTo . '.xlsx';

        return Excel::download(
            new MonitoringPaExport($unitData, $summary, $dateFrom, $dateTo),
            $filename,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Monitoring P2H
    // ─────────────────────────────────────────────────────────────────────────

    public function monitoringP2hPdf(Request $request): Response
    {
        [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo, $jenisUnit] = $this->buildMonitoringP2hData($request);

        $pdf = Pdf::loadView('exports.monitoring-p2h', compact('matrix', 'dates', 'columnSummary', 'summary', 'dateFrom', 'dateTo', 'jenisUnit'))
            ->setPaper('a4', 'landscape');

        $filename = 'monitoring-p2h_' . $dateFrom . '_' . $dateTo . '.pdf';

        return $pdf->download($filename);
    }

    public function monitoringP2hExcel(Request $request)
    {
        [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo] = $this->buildMonitoringP2hData($request);

        $filename = 'monitoring-p2h_' . $dateFrom . '_' . $dateTo . '.xlsx';

        return Excel::download(
            new MonitoringP2hExport($matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo),
            $filename,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // History P2H
    // ─────────────────────────────────────────────────────────────────────────

    public function historyP2hPdf(Request $request): Response
    {
        [$sessions, $filters] = $this->buildHistoryP2hData($request);

        $pdf = Pdf::loadView('exports.history-p2h', compact('sessions', 'filters'))
            ->setPaper('a4', 'portrait');

        $filename = 'riwayat-p2h_' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

    public function historyP2hExcel(Request $request)
    {
        [$sessions, $filters] = $this->buildHistoryP2hData($request);

        $filename = 'riwayat-p2h_' . now()->format('Ymd') . '.xlsx';

        return Excel::download(new HistoryP2hExport($sessions, $filters), $filename);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private: build data (mirrors existing controllers)
    // ─────────────────────────────────────────────────────────────────────────

    private function buildMonitoringPaData(Request $request): array
    {
        $PA_THRESHOLD = 80.0;
        $SHIFT_HOURS  = 12.0;

        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to', now()->toDateString());
        $unitId   = $request->input('unit_id');
        $jenis    = $request->input('jenis_unit');

        $from = Carbon::parse($dateFrom);
        $to   = Carbon::parse($dateTo);
        if ($from->diffInDays($to) > 90) {
            $from     = $to->copy()->subDays(89);
            $dateFrom = $from->toDateString();
        }

        $unitQuery = Unit::active()->orderBy('no_unit');
        if ($unitId) $unitQuery->where('id', $unitId);
        if ($jenis)  $unitQuery->where('jenis_unit', $jenis);
        $units = $unitQuery->get();

        $sessions = P2hSession::with(['unit', 'userEntries.answers'])
            ->whereBetween('tanggal', [$dateFrom, $dateTo])
            ->when($unitId, fn ($q) => $q->where('unit_id', $unitId))
            ->when($jenis, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenis)))
            ->get()
            ->groupBy('unit_id');

        $unitData = $units->map(function (Unit $unit) use ($sessions, $from, $to, $dateFrom, $dateTo, $PA_THRESHOLD, $SHIFT_HOURS) {
            $unitSessions   = $sessions->get($unit->id, collect());
            $sessionsByDate = $unitSessions->groupBy(fn ($s) => $s->tanggal->toDateString());
            $totalDaysWithSession = $sessionsByDate->count();
            $totalDays            = $from->diffInDays($to) + 1;

            $dailyData = $sessionsByDate->map(function (Collection $daySessions) use ($PA_THRESHOLD) {
                $bestScore = $daySessions->map(function ($session) {
                    $total = 0; $layak = 0;
                    foreach ($session->userEntries as $entry) {
                        foreach ($entry->answers as $ans) {
                            $total++;
                            if ($ans->kondisi === 'Layak') $layak++;
                        }
                    }
                    return $total > 0 ? round(($layak / $total) * 100, 1) : null;
                })->filter()->max();

                $kondisiEntries = $daySessions->flatMap(fn ($s) => $s->userEntries)->pluck('kondisi_akhir')->filter()->values();
                $hasOverride    = $daySessions->flatMap(fn ($s) => $s->userEntries)->contains(fn ($e) => $e->is_override);

                if ($kondisiEntries->contains('BD')) {
                    $effectiveStatus = 'bd';
                } elseif ($kondisiEntries->isNotEmpty()) {
                    $effectiveStatus = 'operation';
                } elseif ($bestScore !== null) {
                    $effectiveStatus = $bestScore >= $PA_THRESHOLD ? 'operation' : 'bd';
                } else {
                    $effectiveStatus = 'no_data';
                }

                return ['compliance_score' => $bestScore, 'effective_status' => $effectiveStatus, 'has_override' => $hasOverride];
            });

            $operationDays = $dailyData->where('effective_status', 'operation')->count();
            $bdDays        = $dailyData->where('effective_status', 'bd')->count();
            $compliancePa  = $totalDaysWithSession > 0 ? round(($operationDays / $totalDaysWithSession) * 100, 1) : null;

            $uniqueShifts = [];
            foreach ($unitSessions as $s) {
                foreach ($s->userEntries as $e) {
                    $key = $s->tanggal->toDateString() . '_' . ($e->shift ?? 'unknown');
                    $uniqueShifts[$key] = true;
                }
            }
            $workingHours = count($uniqueShifts) * $SHIFT_HOURS;
            $downtimeHours = UnitDowntimeLog::where('unit_id', $unit->id)->completed()->inRange($dateFrom, $dateTo)
                ->get()->sum(fn ($log) => $log->duration_hours ?? 0.0);
            $actualPa = ($workingHours + $downtimeHours) > 0
                ? round($workingHours / ($workingHours + $downtimeHours) * 100, 1)
                : null;

            $latestSession = $unitSessions->sortByDesc('tanggal')->first();
            $currentStatus = 'no_data';
            if ($latestSession) {
                $ke = $latestSession->userEntries->pluck('kondisi_akhir')->filter()->values();
                $currentStatus = $ke->contains('BD') ? 'bd' : ($ke->isNotEmpty() ? 'operation' : 'no_data');
            }

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
                'current_status' => $currentStatus,
                'latest_date'    => $latestSession?->tanggal->toDateString(),
                'total_sessions' => $totalDaysWithSession,
                'total_days'     => $totalDays,
                'operation_days' => $operationDays,
                'bd_days'        => $bdDays,
                'total_tl'       => $totalTL,
            ];
        })->values()->toArray();

        $withCompliance = collect($unitData)->filter(fn ($u) => $u['compliance_pa'] !== null);
        $withActual     = collect($unitData)->filter(fn ($u) => $u['actual_pa'] !== null);

        $summary = [
            'fleet_compliance_pa'  => $withCompliance->count() > 0 ? round($withCompliance->avg('compliance_pa'), 1) : null,
            'fleet_actual_pa'      => $withActual->count() > 0 ? round($withActual->avg('actual_pa'), 1) : null,
            'total_units'          => count($unitData),
            'operation_count'      => collect($unitData)->where('current_status', 'operation')->count(),
            'bd_count'             => collect($unitData)->where('current_status', 'bd')->count(),
            'no_data_count'        => collect($unitData)->where('current_status', 'no_data')->count(),
            'units_with_time_data' => collect($unitData)->where('has_time_data', true)->count(),
            'pa_threshold'         => $PA_THRESHOLD,
            'shift_hours'          => $SHIFT_HOURS,
        ];

        return [$unitData, $summary, $dateFrom, $dateTo];
    }

    private function buildMonitoringP2hData(Request $request): array
    {
        $PA_THRESHOLD = 80.0;
        $MAX_DAYS     = 31;

        $dateTo   = $request->input('date_to',   now()->toDateString());
        $dateFrom = $request->input('date_from', now()->subDays(13)->toDateString());
        $jenis    = $request->input('jenis_unit');

        $from = Carbon::parse($dateFrom);
        $to   = Carbon::parse($dateTo);
        if ($to->lt($from)) $to = $from->copy();
        if ($from->diffInDays($to) >= $MAX_DAYS) {
            $from     = $to->copy()->subDays($MAX_DAYS - 1);
            $dateFrom = $from->toDateString();
        }
        $dateTo   = $to->toDateString();
        $dateFrom = $from->toDateString();

        $dates     = collect(CarbonPeriod::create($from, $to))->map(fn (Carbon $d) => $d->toDateString())->values()->all();
        $totalDays = count($dates);

        $unitQuery = Unit::active()->orderBy('no_unit');
        if ($jenis) $unitQuery->where('jenis_unit', $jenis);
        $units = $unitQuery->get();

        $sessionMap = [];
        P2hSession::with(['userEntries.answers'])
            ->whereBetween('tanggal', [$dateFrom, $dateTo])
            ->whereIn('unit_id', $units->pluck('id'))
            ->get()
            ->each(function ($session) use (&$sessionMap) {
                $sessionMap[$session->unit_id][$session->tanggal->toDateString()] = $session;
            });

        $matrix = []; $totalFilled = 0; $totalMissed = 0; $totalBdCells = 0; $perfectUnits = 0;

        foreach ($units as $unit) {
            $row = ['id' => $unit->id, 'no_unit' => $unit->no_unit, 'jenis_unit' => $unit->jenis_unit, 'no_lambung' => $unit->no_lambung, 'cells' => []];
            $unitFilled = 0;

            foreach ($dates as $date) {
                $session = $sessionMap[$unit->id][$date] ?? null;
                if (!$session || $session->userEntries->isEmpty()) { $row['cells'][$date] = null; $totalMissed++; continue; }

                $entries       = $session->userEntries;
                $slotsFilled   = $entries->count();
                $totalTl       = $entries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count());
                $kondisiValues = $entries->pluck('kondisi_akhir')->filter()->values();

                if ($kondisiValues->contains('BD')) { $status = 'bd'; $totalBdCells++; }
                elseif ($kondisiValues->isNotEmpty()) { $status = 'layak'; }
                else {
                    $ta = 0; $la = 0;
                    foreach ($entries as $e) { foreach ($e->answers as $a) { $ta++; if ($a->kondisi === 'Layak') $la++; } }
                    $score  = $ta > 0 ? ($la / $ta) * 100 : null;
                    $status = ($score !== null && $score >= $PA_THRESHOLD) ? 'layak' : 'bd';
                    if ($status === 'bd') $totalBdCells++;
                }

                $row['cells'][$date] = ['session_id' => $session->id, 'slots_filled' => $slotsFilled, 'total_tl' => $totalTl, 'status' => $status];
                $unitFilled++; $totalFilled++;
            }

            $row['filled_days']    = $unitFilled;
            $row['total_days']     = $totalDays;
            $row['compliance_pct'] = $totalDays > 0 ? round(($unitFilled / $totalDays) * 100, 1) : 0.0;
            if ($unitFilled === $totalDays) $perfectUnits++;
            $matrix[] = $row;
        }

        $totalUnits    = count($units);
        $columnSummary = [];
        foreach ($dates as $date) {
            $filled = collect($matrix)->filter(fn ($r) => $r['cells'][$date] !== null)->count();
            $columnSummary[$date] = ['filled' => $filled, 'total' => $totalUnits];
        }

        $totalCells = $totalUnits * $totalDays;
        $summary    = [
            'fleet_compliance' => $totalCells > 0 ? round(($totalFilled / $totalCells) * 100, 1) : 0.0,
            'perfect_units'    => $perfectUnits,
            'total_missed'     => $totalMissed,
            'total_bd_days'    => $totalBdCells,
            'total_units'      => $totalUnits,
            'total_days'       => $totalDays,
        ];

        return [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo, $jenis];
    }

    private function buildHistoryP2hData(Request $request): array
    {
        $user  = $request->user();
        $query = P2hSession::with(['unit', 'userEntries.answers'])
            ->when($request->date_from, fn ($q) => $q->whereDate('tanggal', '>=', $request->date_from))
            ->when($request->date_to,   fn ($q) => $q->whereDate('tanggal', '<=', $request->date_to))
            ->when($request->no_unit,   fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$request->no_unit}%")))
            ->when($request->jenis_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $request->jenis_unit)))
            ->when($request->hasil === 'ada_tl',      fn ($q) => $q->whereHas('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->hasil === 'semua_layak', fn ($q) => $q->whereDoesntHave('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')));

        if ($user->hasRole('driver')) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id));
        }

        $sessions = $query->latest()->get()->map(function ($session) {
            return [
                'id'          => $session->id,
                'tanggal'     => $session->tanggal->format('d/m/Y'),
                'no_unit'     => $session->unit->no_unit,
                'jenis_unit'  => $session->unit->jenis_unit,
                'slot_terisi' => $session->userEntries->count(),
                'total_tl'    => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                'status'      => $session->status,
            ];
        })->values()->toArray();

        $filters = [
            'date_from'  => $request->date_from,
            'date_to'    => $request->date_to,
            'no_unit'    => $request->no_unit,
            'jenis_unit' => $request->jenis_unit,
            'hasil'      => $request->hasil,
        ];

        return [$sessions, $filters];
    }
}
