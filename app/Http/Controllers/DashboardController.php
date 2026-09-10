<?php

namespace App\Http\Controllers;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hSession;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $today = now()->toDateString();

        $totalUnitAktif = Unit::active()->count();

        $totalP2hHariIni = P2hSession::whereDate('tanggal', $today)
            ->whereHas('userEntries', fn ($query) => $query->operational())
            ->count();

        $unitTidakLayakHariIni = P2hSession::whereDate('tanggal', $today)
            ->whereHas('userEntries', fn ($query) => $query->operational()
                ->whereHas('answers', fn ($answers) => $answers->where('kondisi', 'Tidak Layak')))
            ->count();

        $criticalTidakLayakHariIni = P2hChecklistAnswer::where('kondisi', 'Tidak Layak')
            ->whereHas('inspectionItem', fn ($q) => $q->where('kode_bahaya', 'AA'))
            ->whereHas('userEntry', fn ($query) => $query->operational()
                ->whereHas('session', fn ($session) => $session->whereDate('tanggal', $today)))
            ->count();

        // Chart: jumlah P2H per hari, 7 hari terakhir
        $chartData = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->toDateString();

            return [
                'tanggal' => $date,
                'label' => now()->subDays($daysAgo)->format('d/m'),
                'total' => P2hSession::whereDate('tanggal', $date)
                    ->whereHas('userEntries', fn ($query) => $query->operational())
                    ->count(),
            ];
        });

        // 10 P2H terbaru
        $recentP2h = P2hSession::with([
            'unit',
            'userEntries' => fn ($query) => $query->operational(),
            'userEntries.answers',
            'userEntries.user',
        ])
            ->whereHas('userEntries', fn ($query) => $query->operational())
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($session) {
                $firstEntry = $session->userEntries->first();

                return [
                    'id' => $session->id,
                    'no_unit' => $session->unit->no_unit,
                    'tanggal' => $session->tanggal->format('d/m/Y'),
                    'driver' => $firstEntry?->user?->name ?? 'Unknown',
                    'total_tl' => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                    'status' => $session->status,
                    'slot_terisi' => $session->userEntries->count(),
                ];
            });

        // Trend PA per minggu, 4 minggu terakhir
        $paWeeklyTrend = collect(range(3, 0))->map(function ($weeksAgo) {
            $weekStart = now()->startOfWeek()->subWeeks($weeksAgo);
            $weekEnd = $weekStart->copy()->endOfWeek();
            $label = $weekStart->format('d/m').'–'.$weekEnd->format('d/m');

            if ($weekEnd->isFuture()) {
                $weekEnd = now()->endOfDay();
            }

            $totalUnits = Unit::active()->count();
            if ($totalUnits === 0) {
                return ['label' => $label, 'pa' => 0];
            }

            // Hitung hari di minggu ini dengan setidaknya 1 sesi P2H yang Layak Pakai
            $daysInWeek = $weekStart->diffInDays($weekEnd) + 1;
            $totalSlots = $totalUnits * $daysInWeek;

            // Satu sesi mewakili satu unit-hari (unit_id + tanggal unik).
            $operationSessions = P2hSession::whereBetween('tanggal', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->whereHas('userEntries', fn ($q) => $q->operational()->where('kondisi_akhir', 'Layak Pakai'))
                ->whereDoesntHave('userEntries', fn ($q) => $q->operational()->where('kondisi_akhir', 'BD'))
                ->count();

            // PA = jumlah unit yang masuk operasi / total slot unit × 100
            $pa = $totalSlots > 0 ? round(($operationSessions / $totalSlots) * 100, 1) : 0;

            return ['label' => $label, 'pa' => $pa];
        });

        return Inertia::render('dashboard/index', [
            'metrics' => [
                'total_unit_aktif' => $totalUnitAktif,
                'total_p2h_hari_ini' => $totalP2hHariIni,
                'unit_tidak_layak_hari_ini' => $unitTidakLayakHariIni,
                'critical_tidak_layak' => $criticalTidakLayakHariIni,
            ],
            'chartData' => $chartData,
            'paWeeklyTrend' => $paWeeklyTrend,
            'recentP2h' => $recentP2h,
        ]);
    }
}
