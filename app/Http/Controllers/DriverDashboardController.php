<?php

namespace App\Http\Controllers;

use App\Models\P2hUserEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DriverDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user  = $request->user();
        $today = now()->toDateString();

        // Tentukan shift aktif berdasarkan jam (Shift I: 06-18, Shift II: 18-06)
        $hour        = (int) now()->format('H');
        $shiftAktif  = ($hour >= 6 && $hour < 18) ? 'Shift I' : 'Shift II';

        // Cek apakah driver sudah melakukan P2H shift ini hari ini
        $sudahP2hShiftIni = P2hUserEntry::where('user_id', $user->id)
            ->where('shift', $shiftAktif)
            ->whereHas('session', fn ($q) => $q->whereDate('tanggal', $today))
            ->exists();

        // Statistik ringkas driver
        $totalP2hSelesai = P2hUserEntry::where('user_id', $user->id)->count();

        $totalP2hBulanIni = P2hUserEntry::where('user_id', $user->id)
            ->whereHas('session', fn ($q) => $q->whereMonth('tanggal', now()->month)->whereYear('tanggal', now()->year))
            ->count();

        $totalTidakLayak = P2hUserEntry::where('user_id', $user->id)
            ->withCount(['answers as tidak_layak_count' => fn ($q) => $q->where('kondisi', 'Tidak Layak')])
            ->get()
            ->sum('tidak_layak_count');

        // History P2H driver — 20 terbaru, diurutkan berdasarkan submitted_at lalu created_at
        $history = P2hUserEntry::where('user_id', $user->id)
            ->with(['session.unit', 'answers'])
            ->orderByRaw('COALESCE(submitted_at, created_at) DESC')
            ->take(20)
            ->get()
            ->map(function (P2hUserEntry $entry) {
                $totalItems  = $entry->answers->count();
                $layakCount  = $entry->answers->where('kondisi', 'Layak')->count();
                $tlCount     = $entry->answers->where('kondisi', 'Tidak Layak')->count();
                $score       = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;

                return [
                    'id'            => $entry->id,
                    'session_id'    => $entry->p2h_session_id,
                    'no_unit'       => $entry->session->unit->no_unit ?? '-',
                    'jenis_unit'    => $entry->session->unit->jenis_unit ?? '-',
                    'tanggal'       => $entry->session->tanggal->format('d/m/Y'),
                    'shift'         => $entry->shift,
                    'km_awal'       => $entry->km_awal,
                    'kondisi_akhir' => $entry->kondisi_akhir,
                    'total_items'   => $totalItems,
                    'layak_count'   => $layakCount,
                    'tl_count'      => $tlCount,
                    'score'         => $score,
                    'submitted_at'  => $entry->submitted_at?->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('driver-dashboard/index', [
            'shiftAktif'        => $shiftAktif,
            'sudahP2hShiftIni'  => $sudahP2hShiftIni,
            'stats' => [
                'total_p2h'          => $totalP2hSelesai,
                'total_p2h_bulan'    => $totalP2hBulanIni,
                'total_tidak_layak'  => $totalTidakLayak,
            ],
            'history' => $history,
        ]);
    }
}
