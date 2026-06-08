<?php

namespace App\Http\Controllers;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hSession;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $today = now()->toDateString();

        $totalUnitAktif = Unit::active()->count();

        $totalP2hHariIni = P2hSession::whereDate('tanggal', $today)->count();

        $unitTidakLayakHariIni = P2hSession::whereDate('tanggal', $today)
            ->whereHas('userEntries.answers', fn ($q) => $q->where('kondisi', 'Tidak Layak'))
            ->count();

        $criticalTidakLayakHariIni = P2hChecklistAnswer::where('kondisi', 'Tidak Layak')
            ->whereHas('inspectionItem', fn ($q) => $q->where('kode_bahaya', 'AA'))
            ->whereHas('userEntry.session', fn ($q) => $q->whereDate('tanggal', $today))
            ->count();

        // Chart: jumlah P2H per hari, 7 hari terakhir
        $chartData = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->toDateString();

            return [
                'tanggal' => $date,
                'label'   => now()->subDays($daysAgo)->format('d/m'),
                'total'   => P2hSession::whereDate('tanggal', $date)->count(),
            ];
        });

        // 10 P2H terbaru
        $recentP2h = P2hSession::with(['unit', 'userEntries.answers', 'userEntries.user'])
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($session) {
                $firstEntry = $session->userEntries->first();

                return [
                    'id'            => $session->id,
                    'no_unit'       => $session->unit->no_unit,
                    'tanggal'       => $session->tanggal->format('d/m/Y'),
                    'driver'        => $firstEntry?->user?->name ?? 'Unknown',
                    'total_tl'      => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                    'status'        => $session->status,
                    'slot_terisi'   => $session->userEntries->count(),
                ];
            });

        return Inertia::render('dashboard/index', [
            'metrics' => [
                'total_unit_aktif'          => $totalUnitAktif,
                'total_p2h_hari_ini'        => $totalP2hHariIni,
                'unit_tidak_layak_hari_ini' => $unitTidakLayakHariIni,
                'critical_tidak_layak'      => $criticalTidakLayakHariIni,
            ],
            'chartData'  => $chartData,
            'recentP2h'  => $recentP2h,
        ]);
    }
}
