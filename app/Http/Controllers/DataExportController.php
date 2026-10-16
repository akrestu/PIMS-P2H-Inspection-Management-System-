<?php

namespace App\Http\Controllers;

use App\Exports\HistoryP2hExport;
use App\Exports\MonitoringP2hExport;
use App\Exports\MonitoringPaExport;
use App\Models\P2hSession;
use App\Models\Unit;
use App\Support\FleetAvailability;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;

class DataExportController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Monitoring PA
    // ─────────────────────────────────────────────────────────────────────────

    public function monitoringPaPdf(Request $request): Response
    {
        $this->validateMonitoringPaFilters($request);
        [$unitData, $summary, $dateFrom, $dateTo] = $this->buildMonitoringPaData($request);

        $pdf = Pdf::loadView('exports.monitoring-pa', compact('unitData', 'summary', 'dateFrom', 'dateTo'))
            ->setPaper('a4', 'landscape');

        $filename = 'monitoring-pa_'.$dateFrom.'_'.$dateTo.'.pdf';

        return $pdf->download($filename);
    }

    public function monitoringPaExcel(Request $request)
    {
        $this->validateMonitoringPaFilters($request);
        [$unitData, $summary, $dateFrom, $dateTo] = $this->buildMonitoringPaData($request);

        $filename = 'monitoring-pa_'.$dateFrom.'_'.$dateTo.'.xlsx';

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
        $this->validateMonitoringP2hFilters($request);
        [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo, $jenisUnit] = $this->buildMonitoringP2hData($request);

        $pdf = Pdf::loadView('exports.monitoring-p2h', compact('matrix', 'dates', 'columnSummary', 'summary', 'dateFrom', 'dateTo', 'jenisUnit'))
            ->setPaper('a4', 'landscape');

        $filename = 'monitoring-p2h_'.$dateFrom.'_'.$dateTo.'.pdf';

        return $pdf->download($filename);
    }

    public function monitoringP2hExcel(Request $request)
    {
        $this->validateMonitoringP2hFilters($request);
        [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo] = $this->buildMonitoringP2hData($request);

        $filename = 'monitoring-p2h_'.$dateFrom.'_'.$dateTo.'.xlsx';

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
        $this->validateHistoryFilters($request);
        [$sessions, $filters] = $this->buildHistoryP2hData($request);

        $pdf = Pdf::loadView('exports.history-p2h', compact('sessions', 'filters'))
            ->setPaper('a4', 'portrait');

        $filename = 'riwayat-p2h_'.now()->format('Ymd').'.pdf';

        return $pdf->download($filename);
    }

    public function historyP2hExcel(Request $request)
    {
        $this->validateHistoryFilters($request);
        [$sessions, $filters] = $this->buildHistoryP2hData($request);

        $filename = 'riwayat-p2h_'.now()->format('Ymd').'.xlsx';

        return Excel::download(new HistoryP2hExport($sessions, $filters), $filename);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private: build data (mirrors existing controllers)
    // ─────────────────────────────────────────────────────────────────────────

    private function buildMonitoringPaData(Request $request): array
    {
        $from = Carbon::parse($request->input('date_from', now()->startOfMonth()->toDateString()));
        $to = Carbon::parse($request->input('date_to', now()->toDateString()));
        if ($from->diffInDays($to) > 90) {
            $from = $to->copy()->subDays(89);
        }

        $result = FleetAvailability::build($from, $to, [
            'unit_id' => $request->input('unit_id'),
            'jenis_unit' => $request->input('jenis_unit'),
        ], $request->user());

        return [$result['units']->toArray(), $result['summary'], $from->toDateString(), $to->toDateString()];
    }

    private function buildMonitoringP2hData(Request $request): array
    {
        $PA_THRESHOLD = 80.0;
        $MAX_DAYS = 31;

        $dateTo = $request->input('date_to', now()->toDateString());
        $dateFrom = $request->input('date_from', now()->subDays(13)->toDateString());
        $jenis = $request->input('jenis_unit');

        $from = Carbon::parse($dateFrom);
        $to = Carbon::parse($dateTo);
        if ($to->lt($from)) {
            $to = $from->copy();
        }
        if ($from->diffInDays($to) >= $MAX_DAYS) {
            $from = $to->copy()->subDays($MAX_DAYS - 1);
            $dateFrom = $from->toDateString();
        }
        $dateTo = $to->toDateString();
        $dateFrom = $from->toDateString();

        $dates = collect(CarbonPeriod::create($from, $to))->map(fn (Carbon $d) => $d->toDateString())->values()->all();
        $totalDays = count($dates);

        $unitQuery = Unit::active()->orderBy('no_unit');
        if ($jenis) {
            $unitQuery->where('jenis_unit', $jenis);
        }
        $units = $unitQuery->get();

        $sessionMap = [];
        P2hSession::with([
            'userEntries' => fn ($query) => $query->operational(),
            'userEntries.answers',
        ])
            ->whereHas('userEntries', fn ($query) => $query->operational())
            ->whereDate('tanggal', '>=', $dateFrom)->whereDate('tanggal', '<=', $dateTo)
            ->whereIn('unit_id', $units->pluck('id'))
            ->get()
            ->each(function ($session) use (&$sessionMap) {
                $sessionMap[$session->unit_id][$session->tanggal->toDateString()] = $session;
            });

        $matrix = [];
        $totalFilled = 0;
        $totalMissed = 0;
        $totalBdCells = 0;
        $perfectUnits = 0;

        foreach ($units as $unit) {
            $row = ['id' => $unit->id, 'no_unit' => $unit->no_unit, 'jenis_unit' => $unit->jenis_unit, 'no_lambung' => $unit->no_lambung, 'cells' => []];
            $unitFilled = 0;

            foreach ($dates as $date) {
                $session = $sessionMap[$unit->id][$date] ?? null;
                if (! $session || $session->userEntries->isEmpty()) {
                    $row['cells'][$date] = null;
                    $totalMissed++;

                    continue;
                }

                $entries = $session->userEntries;
                $slotsFilled = $entries->count();
                $totalTl = $entries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count());
                $kondisiValues = $entries->pluck('kondisi_akhir')->filter()->values();

                if ($kondisiValues->contains('BD')) {
                    $status = 'bd';
                    $totalBdCells++;
                } elseif ($kondisiValues->isNotEmpty()) {
                    $status = 'layak';
                } else {
                    $ta = 0;
                    $la = 0;
                    foreach ($entries as $e) {
                        foreach ($e->answers as $a) {
                            $ta++;
                            if ($a->kondisi === 'Layak') {
                                $la++;
                            }
                        }
                    }
                    $score = $ta > 0 ? ($la / $ta) * 100 : null;
                    $status = ($score !== null && $score >= $PA_THRESHOLD) ? 'layak' : 'bd';
                    if ($status === 'bd') {
                        $totalBdCells++;
                    }
                }

                $row['cells'][$date] = ['session_id' => $session->id, 'slots_filled' => $slotsFilled, 'total_tl' => $totalTl, 'status' => $status];
                $unitFilled++;
                $totalFilled++;
            }

            $row['filled_days'] = $unitFilled;
            $row['total_days'] = $totalDays;
            $row['compliance_pct'] = $totalDays > 0 ? round(($unitFilled / $totalDays) * 100, 1) : 0.0;
            if ($unitFilled === $totalDays) {
                $perfectUnits++;
            }
            $matrix[] = $row;
        }

        $totalUnits = count($units);
        $columnSummary = [];
        foreach ($dates as $date) {
            $filled = collect($matrix)->filter(fn ($r) => $r['cells'][$date] !== null)->count();
            $columnSummary[$date] = ['filled' => $filled, 'total' => $totalUnits];
        }

        $totalCells = $totalUnits * $totalDays;
        $summary = [
            'fleet_compliance' => $totalCells > 0 ? round(($totalFilled / $totalCells) * 100, 1) : 0.0,
            'perfect_units' => $perfectUnits,
            'total_missed' => $totalMissed,
            'total_bd_days' => $totalBdCells,
            'total_units' => $totalUnits,
            'total_days' => $totalDays,
        ];

        return [$matrix, $dates, $columnSummary, $summary, $dateFrom, $dateTo, $jenis];
    }

    private function buildHistoryP2hData(Request $request): array
    {
        $user = $request->user();
        $dateTo = Carbon::parse($request->input('date_to', now()->toDateString()));
        $dateFrom = Carbon::parse($request->input('date_from', $dateTo->copy()->subDays(89)->toDateString()));

        if ($dateFrom->diffInDays($dateTo) > 89) {
            $dateFrom = $dateTo->copy()->subDays(89);
        }

        $entryScope = function ($query) use ($user) {
            if ($user->isStaffOnly()) {
                $query->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('pic_approver_id', $user->id));
            } elseif (! $user->isPrivileged()) {
                $query->where('user_id', $user->id);
            }
        };

        $query = P2hSession::with([
            'unit',
            'userEntries' => $entryScope,
            'userEntries.user',
            'userEntries.answers.inspectionItem',
        ])
            ->whereDate('tanggal', '>=', $dateFrom->toDateString())->whereDate('tanggal', '<=', $dateTo->toDateString())
            ->when($request->no_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$request->no_unit}%")))
            ->when($request->jenis_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $request->jenis_unit)))
            ->when($request->hasil === 'ada_tl', fn ($q) => $q->whereHas('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->hasil === 'semua_layak', fn ($q) => $q->whereDoesntHave('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->user_id, fn ($q) => $q->whereHas('userEntries', fn ($e) => $e->where('user_id', $request->user_id)));

        if ($user->isStaffOnly()) {
            // Approval/User LV 2 bisa jadi submitter; Approval juga PIC approver — tampilkan keduanya
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id)
                ->orWhere('pic_approver_id', $user->id));
        } elseif ($user->hasRole('driver')) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id));
        }

        $sessions = $query->latest('tanggal')->get();

        $rows = [];
        foreach ($sessions as $session) {
            foreach ($session->userEntries as $entry) {
                $tlItems = $entry->answers
                    ->where('kondisi', 'Tidak Layak')
                    ->map(fn ($a) => $a->inspectionItem?->nama_item ?? '?')
                    ->filter()
                    ->values();

                $hasilDetail = $tlItems->isNotEmpty()
                    ? 'TL: '.$tlItems->implode(', ')
                    : 'Semua Layak';

                $statusUnit = match ($entry->kondisi_akhir) {
                    'BD' => 'BD',
                    'Layak Pakai' => 'OP',
                    default => '-',
                };

                $rows[] = [
                    'tanggal' => $session->tanggal->format('d/m/Y'),
                    'shift' => $entry->shift ?? '-',
                    'no_unit' => $session->unit->no_unit,
                    'jenis_unit' => $session->unit->jenis_unit,
                    'user' => $entry->user?->name ?? '-',
                    'hasil_detail' => $hasilDetail,
                    'status_unit' => $statusUnit,
                ];
            }
        }

        $filters = [
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'no_unit' => $request->no_unit,
            'jenis_unit' => $request->jenis_unit,
            'hasil' => $request->hasil,
            'user_id' => $request->user_id,
        ];

        return [$rows, $filters];
    }

    private function validateMonitoringPaFilters(Request $request): void
    {
        $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'jenis_unit' => ['nullable', 'in:Bus,Light Vehicle'],
        ]);
    }

    private function validateMonitoringP2hFilters(Request $request): void
    {
        $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'jenis_unit' => ['nullable', 'in:Bus,Light Vehicle'],
        ]);
    }

    private function validateHistoryFilters(Request $request): void
    {
        $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'no_unit' => ['nullable', 'string', 'max:100'],
            'jenis_unit' => ['nullable', 'in:Bus,Light Vehicle'],
            'hasil' => ['nullable', 'in:ada_tl,semua_layak'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
