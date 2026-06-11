<?php

namespace App\Http\Controllers;

use App\Models\P2hSession;
use App\Models\Unit;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class P2hComplianceController extends Controller
{
    private const PA_THRESHOLD = 80.0;
    private const MAX_DAYS = 31;

    public function index(Request $request): Response
    {
        $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to'   => 'nullable|date_format:Y-m-d',
            'jenis_unit'=> 'nullable|in:Bus,Light Vehicle',
        ]);

        // ── 1. Parse + clamp date range (max 31 hari, default 14 hari terakhir) ──
        $dateTo   = $request->input('date_to',   now()->toDateString());
        $dateFrom = $request->input('date_from', now()->subDays(13)->toDateString());
        $jenis    = $request->input('jenis_unit');

        $from = Carbon::parse($dateFrom);
        $to   = Carbon::parse($dateTo);

        if ($to->lt($from)) {
            $to = $from->copy();
        }

        if ($from->diffInDays($to) >= self::MAX_DAYS) {
            $from     = $to->copy()->subDays(self::MAX_DAYS - 1);
            $dateFrom = $from->toDateString();
        }

        $dateTo   = $to->toDateString();
        $dateFrom = $from->toDateString();

        $dates     = collect(CarbonPeriod::create($from, $to))
            ->map(fn (Carbon $d) => $d->toDateString())
            ->values()
            ->all();
        $totalDays = count($dates);

        // ── 2. Units aktif (dengan optional jenis_unit filter) ────────────────
        $unitQuery = Unit::active()->orderBy('no_unit');
        if ($jenis) {
            $unitQuery->where('jenis_unit', $jenis);
        }
        $units = $unitQuery->get();

        // ── 3. Load sessions + entries + answers — 3 queries total (no N+1) ───
        $sessionMap = [];
        P2hSession::with(['userEntries.answers'])
            ->whereBetween('tanggal', [$dateFrom, $dateTo])
            ->whereIn('unit_id', $units->pluck('id'))
            ->get()
            ->each(function ($session) use (&$sessionMap) {
                $sessionMap[$session->unit_id][$session->tanggal->toDateString()] = $session;
            });

        // ── 4. Build matrix rows ──────────────────────────────────────────────
        $matrix      = [];
        $totalFilled = 0;
        $totalMissed = 0;
        $totalBdCells = 0;
        $perfectUnits = 0;

        foreach ($units as $unit) {
            $row = [
                'id'         => $unit->id,
                'no_unit'    => $unit->no_unit,
                'jenis_unit' => $unit->jenis_unit,
                'no_lambung' => $unit->no_lambung,
                'cells'      => [],
            ];
            $unitFilled = 0;

            foreach ($dates as $date) {
                $session = $sessionMap[$unit->id][$date] ?? null;

                if (! $session || $session->userEntries->isEmpty()) {
                    $row['cells'][$date] = null;
                    $totalMissed++;
                    continue;
                }

                $entries       = $session->userEntries;
                $slotsFilled   = $entries->count();
                $totalTl       = $entries->sum(
                    fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()
                );
                $kondisiValues = $entries->pluck('kondisi_akhir')->filter()->values();

                if ($kondisiValues->contains('BD')) {
                    $status = 'bd';
                    $totalBdCells++;
                } elseif ($kondisiValues->isNotEmpty()) {
                    $status = 'layak';
                } else {
                    // Fallback ke checklist score
                    $totalAns = 0;
                    $layakAns = 0;
                    foreach ($entries as $e) {
                        foreach ($e->answers as $a) {
                            $totalAns++;
                            if ($a->kondisi === 'Layak') {
                                $layakAns++;
                            }
                        }
                    }
                    $score  = $totalAns > 0 ? ($layakAns / $totalAns) * 100 : null;
                    $status = ($score !== null && $score >= self::PA_THRESHOLD) ? 'layak' : 'bd';
                    if ($status === 'bd') {
                        $totalBdCells++;
                    }
                }

                $row['cells'][$date] = [
                    'session_id'   => $session->id,
                    'slots_filled' => $slotsFilled,
                    'total_tl'     => $totalTl,
                    'status'       => $status,
                ];
                $unitFilled++;
                $totalFilled++;
            }

            $row['filled_days']    = $unitFilled;
            $row['total_days']     = $totalDays;
            $row['compliance_pct'] = $totalDays > 0
                ? round(($unitFilled / $totalDays) * 100, 1)
                : 0.0;

            if ($unitFilled === $totalDays) {
                $perfectUnits++;
            }

            $matrix[] = $row;
        }

        // ── 5. Column summaries (berapa unit mengisi P2H per tanggal) ─────────
        $totalUnits    = count($units);
        $columnSummary = [];

        foreach ($dates as $date) {
            $filled = collect($matrix)
                ->filter(fn ($r) => $r['cells'][$date] !== null)
                ->count();
            $columnSummary[$date] = ['filled' => $filled, 'total' => $totalUnits];
        }

        // ── 6. Fleet summary cards ────────────────────────────────────────────
        $totalCells = $totalUnits * $totalDays;
        $summary    = [
            'fleet_compliance' => $totalCells > 0
                ? round(($totalFilled / $totalCells) * 100, 1)
                : 0.0,
            'perfect_units'    => $perfectUnits,
            'total_missed'     => $totalMissed,
            'total_bd_days'    => $totalBdCells,
            'total_units'      => $totalUnits,
            'total_days'       => $totalDays,
        ];

        return Inertia::render('p2h/compliance', [
            'matrix'        => $matrix,
            'dates'         => $dates,
            'columnSummary' => $columnSummary,
            'summary'       => $summary,
            'filters'       => [
                'date_from'  => $dateFrom,
                'date_to'    => $dateTo,
                'jenis_unit' => $jenis,
            ],
        ]);
    }
}
