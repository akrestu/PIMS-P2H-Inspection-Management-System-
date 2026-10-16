<?php

namespace App\Http\Controllers;

use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
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

        // Cek apakah driver sudah P2H untuk shift aktif. P2H pre-start boleh diisi
        // sebelum shift mulai (mis. 05:48 untuk Shift I), jadi jendelanya dibuka 2 jam
        // lebih awal; label shift pada entry tetap harus sama.
        $entryShiftIni = P2hUserEntry::where('user_id', $user->id)
            ->where('shift', $shiftAktif)
            ->where('submitted_at', '>=', $shiftMulai->copy()->subHours(2))
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

        // Jejak 7 hari terakhir untuk strip mini di Beranda (BerandaDriver.png):
        // bd = ada P2H Tidak Layak/BD, layak = P2H masuk, none = tidak ada P2H
        $last7 = P2hUserEntry::where('user_id', $user->id)
            ->notRejected()
            ->where('submitted_at', '>=', today()->subDays(6))
            ->get(['submitted_at', 'kondisi_akhir'])
            ->groupBy(fn (P2hUserEntry $e) => $e->submitted_at->toDateString());
        $week = collect(range(6, 0))->map(function (int $ago) use ($last7) {
            $date = today()->subDays($ago)->toDateString();
            $entries = $last7->get($date);

            return [
                'date' => $date,
                'status' => ! $entries ? 'none' : ($entries->contains('kondisi_akhir', 'BD') ? 'bd' : 'layak'),
            ];
        });

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

        // Penugasan unit bersifat opsional & fleksibel (aturan sama dengan User::canAccessP2hUnit):
        // langsung per unit, per kategori (jenis unit / site), atau belum ada.
        $assignment = $this->assignment($user);
        $unit = $this->todayUnit($user, $assignment);

        return Inertia::render('driver-dashboard/index', [
            'assignment' => $assignment,
            'todayUnit' => $unit ? $this->unitSummary($unit, $assignment['mode'] === 'unit') : null,
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
                'week' => $week,
            ],
            'history' => $history,
        ]);
    }

    /**
     * Mode penugasan unit driver (read-only, untuk tampilan Beranda).
     *
     * @return array{mode: 'semua'|'unit'|'kategori'|'none', units: list<array<string, mixed>>, jenis_unit: ?string, site: ?string}
     */
    private function assignment(User $user): array
    {
        $base = ['units' => [], 'jenis_unit' => null, 'site' => null];

        if ($user->isPrivileged()) {
            return ['mode' => 'semua'] + $base;
        }

        $units = $user->units()->active()->orderBy('no_unit')->get(['units.id', 'no_unit', 'jenis_unit']);

        if ($units->isNotEmpty()) {
            return ['mode' => 'unit'] + array_merge($base, [
                'units' => $units->map(fn (Unit $u) => ['id' => $u->id, 'no_unit' => $u->no_unit, 'jenis_unit' => $u->jenis_unit])->all(),
            ]);
        }

        if ($user->site_id !== null || $user->jenis_unit !== null) {
            return ['mode' => 'kategori'] + array_merge($base, [
                'jenis_unit' => $user->jenis_unit,
                'site' => $user->site?->name,
            ]);
        }

        return ['mode' => 'none'] + $base;
    }

    /**
     * Unit yang ditonjolkan di kartu "Unit hari ini": unit yang terakhir di-P2H driver
     * selama masih dalam cakupan penugasannya; bila penugasan langsung, unit pertama.
     *
     * @param  array{mode: string, units: list<array<string, mixed>>}  $assignment
     */
    private function todayUnit(User $user, array $assignment): ?Unit
    {
        if ($assignment['mode'] === 'none') {
            return null;
        }

        $recent = P2hUserEntry::where('user_id', $user->id)
            ->whereHas('session.unit')
            ->with('session.unit.site:id,name')
            ->latest('submitted_at')
            ->take(10)
            ->get()
            ->map(fn (P2hUserEntry $e) => $e->session->unit)
            ->first(fn (Unit $u) => $user->canAccessP2hUnit($u));

        if ($recent) {
            return $recent;
        }

        return $assignment['mode'] === 'unit'
            ? Unit::with('site:id,name')->find($assignment['units'][0]['id'])
            : null;
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
