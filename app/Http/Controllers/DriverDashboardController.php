<?php

namespace App\Http\Controllers;

use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Support\UnitStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DriverDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Tentukan shift aktif berdasarkan jam (Shift I: 06-18, Shift II: 18-06)
        $hour = (int) now()->format('H');
        $shiftAktif = ($hour >= 6 && $hour < 18) ? 'Shift I' : 'Shift II';

        // Awal shift aktif; Shift II setelah tengah malam dimulai pukul 18:00 kemarin
        $shiftMulai = match (true) {
            $shiftAktif === 'Shift I' => today()->setTime(6, 0),
            $hour >= 18 => today()->setTime(18, 0),
            default => today()->subDay()->setTime(18, 0),
        };

        // Cek apakah driver sudah melakukan P2H sejak shift aktif dimulai
        $entryShiftIni = P2hUserEntry::where('user_id', $user->id)
            ->where('shift', $shiftAktif)
            ->where('submitted_at', '>=', $shiftMulai)
            ->whereHas('session')
            ->with(['session.unit:id,no_unit', 'pic:id,name'])
            ->latest('submitted_at')
            ->first();
        $sudahP2hShiftIni = $entryShiftIni !== null;

        // Statistik ringkas driver
        $totalP2hSelesai = P2hUserEntry::where('user_id', $user->id)->count();

        $totalP2hBulanIni = P2hUserEntry::where('user_id', $user->id)
            ->whereHas('session', fn ($q) => $q->whereMonth('tanggal', now()->month)->whereYear('tanggal', now()->year))
            ->count();

        $totalTidakLayak = P2hChecklistAnswer::whereHas('userEntry', fn ($q) => $q->where('user_id', $user->id))
            ->where('kondisi', 'Tidak Layak')
            ->count();

        // History P2H driver — 10 terbaru untuk menjaga performa mobile
        $history = P2hUserEntry::where('user_id', $user->id)
            ->with(['session.unit', 'answers'])
            ->orderByRaw('COALESCE(submitted_at, created_at) DESC')
            ->take(10)
            ->get()
            ->map(function (P2hUserEntry $entry) {
                $totalItems = $entry->answers->count();
                $layakCount = $entry->answers->where('kondisi', 'Layak')->count();
                $tlCount = $entry->answers->where('kondisi', 'Tidak Layak')->count();
                $score = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;

                return [
                    'id' => $entry->id,
                    'session_id' => $entry->p2h_session_id,
                    'no_unit' => $entry->session?->unit?->no_unit ?? '-',
                    'jenis_unit' => $entry->session?->unit?->jenis_unit ?? '-',
                    'tanggal' => $entry->session?->tanggal?->format('d/m/Y') ?? '-',
                    'shift' => $entry->shift,
                    'km_awal' => $entry->km_awal,
                    'kondisi_akhir' => $entry->kondisi_akhir,
                    'total_items' => $totalItems,
                    'layak_count' => $layakCount,
                    'tl_count' => $tlCount,
                    'score' => $score,
                    'submitted_at' => $entry->submitted_at?->format('d/m/Y H:i'),
                ];
            });

        // Unit hari ini (read-only): unit yang ditugaskan ke driver, atau unit P2H terakhirnya
        $assignedUnit = $user->units()->with('site:id,name')->orderBy('no_unit')->first();
        $unit = $assignedUnit ?? P2hUserEntry::where('user_id', $user->id)
            ->whereHas('session.unit')
            ->with('session.unit.site:id,name')
            ->latest('submitted_at')
            ->first()?->session?->unit;

        return Inertia::render('driver-dashboard/index', [
            'todayUnit' => $unit ? $this->unitSummary($unit, $assignedUnit !== null) : null,
            'currentEntry' => $entryShiftIni ? [
                'session_id' => $entryShiftIni->p2h_session_id,
                'no_unit' => $entryShiftIni->session?->unit?->no_unit,
                'submitted_at' => $entryShiftIni->submitted_at?->format('H:i'),
                'kondisi_akhir' => $entryShiftIni->kondisi_akhir,
                'approval_status' => $entryShiftIni->approval_status,
                'approver_name' => $entryShiftIni->pic?->name,
            ] : null,
            'unitFindings' => $unit
                ? $this->openFindings($unit)
                : ['count' => 0, 'overdue' => 0, 'items' => []],
            'shiftAktif' => $shiftAktif,
            'sudahP2hShiftIni' => $sudahP2hShiftIni,
            'stats' => [
                'total_p2h' => $totalP2hSelesai,
                'total_p2h_bulan' => $totalP2hBulanIni,
                'total_tidak_layak' => $totalTidakLayak,
            ],
            'history' => $history,
        ]);
    }

    /** @return array<string, mixed> */
    private function unitSummary(Unit $unit, bool $assigned): array
    {
        $ongoing = UnitDowntimeLog::where('unit_id', $unit->id)
            ->whereNull('jam_selesai')
            ->latest('jam_mulai')
            ->first();

        return [
            'id' => $unit->id,
            'no_unit' => $unit->no_unit,
            'jenis_unit' => $unit->jenis_unit,
            'site' => $unit->site?->name,
            'assigned' => $assigned,
            'status' => $ongoing?->tipe ?? UnitStatus::READY,
            'hm_terakhir' => P2hUserEntry::whereHas('session', fn ($q) => $q->where('unit_id', $unit->id))
                ->whereNotNull('km_awal')
                ->latest('submitted_at')
                ->value('km_awal'),
        ];
    }

    /**
     * Temuan belum closed untuk unit (maks 3 item untuk Beranda).
     *
     * @return array<string, mixed>
     */
    private function openFindings(Unit $unit): array
    {
        $open = P2hFinding::where('unit_id', $unit->id)
            ->where('status', '!=', FindingStatus::Closed)
            ->orderBy('target_selesai')
            ->get();

        return [
            'count' => $open->count(),
            'overdue' => $open->filter(fn (P2hFinding $f) => $f->isOverdue())->count(),
            'items' => $open->take(3)->map(fn (P2hFinding $f) => [
                'id' => $f->id,
                'item_nama' => $f->item_nama,
                'kritis' => $f->kode_bahaya === 'AA',
                'status' => $f->status->value,
                'target_selesai' => $f->target_selesai?->toDateString(),
                'overdue' => $f->isOverdue(),
            ])->values(),
        ];
    }
}
