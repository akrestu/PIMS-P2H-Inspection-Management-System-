<?php

namespace App\Http\Controllers;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hSession;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Support\FleetAvailability;
use App\Support\TodayP2hStatus;
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
            // Snapshot kode bahaya saat P2H diisi, bukan master item yang bisa berubah
            ->where('item_kode_bahaya', 'AA')
            ->whereHas('userEntry', fn ($query) => $query->operational()
                ->whereHas('session', fn ($session) => $session->whereDate('tanggal', $today)))
            ->count();

        // Status P2H hari ini per unit + ketersediaan armada (Dashboard-Desktop.png)
        $units = Unit::active()->with('users:id,name')->orderBy('no_unit')->get();

        // PA hari ini (berjalan) vs kemarin — rumus yang sama dengan Monitoring PA
        $paToday = FleetAvailability::build(today(), now())['summary']['fleet_actual_pa'];
        $paYesterday = FleetAvailability::build(today()->subDay(), today()->subDay()->endOfDay())['summary']['fleet_actual_pa'];

        return Inertia::render('dashboard/index', [
            'fleetToday' => $this->fleetToday(),
            'metrics' => [
                'total_unit_aktif' => $totalUnitAktif,
                'total_p2h_hari_ini' => $totalP2hHariIni,
                'unit_tidak_layak_hari_ini' => $unitTidakLayakHariIni,
                'critical_tidak_layak' => $criticalTidakLayakHariIni,
            ],
            'today' => TodayP2hStatus::build(today(), $units),
            'complianceTrend' => TodayP2hStatus::complianceTrend(30, $units),
            'pa' => ['today' => $paToday, 'yesterday' => $paYesterday],
            'updatedAt' => now()->format('H:i'),
        ]);
    }

    /**
     * Kondisi armada hari ini per jenis unit, sama dengan pengelompokan Daily Report:
     * P2H layak / ada temuan / BD, tidak Ready (BD/PM/Servis tanpa P2H), belum P2H.
     *
     * @return array<string, array{layak: int, temuan: int, bd: int, tidak_ready: int, belum: int, total: int}>
     */
    private function fleetToday(): array
    {
        $units = Unit::active()->get(['id', 'jenis_unit']);

        $p2h = P2hSession::query()
            ->whereDate('tanggal', today())
            ->whereIn('unit_id', $units->pluck('id'))
            ->whereHas('userEntries', fn ($q) => $q->notRejected())
            ->with(['userEntries' => fn ($q) => $q->notRejected()->select('id', 'p2h_session_id', 'kondisi_akhir')
                ->withCount(['answers as tidak_layak' => fn ($a) => $a->where('kondisi', 'Tidak Layak')])])
            ->get(['id', 'unit_id'])
            ->mapWithKeys(fn (P2hSession $s) => [$s->unit_id => $s->userEntries->contains('kondisi_akhir', 'BD') ? 'bd'
                : ($s->userEntries->sum('tidak_layak') > 0 ? 'temuan' : 'layak')]);

        $notReady = UnitDowntimeLog::whereIn('unit_id', $units->pluck('id'))
            ->where('jam_mulai', '<=', now())
            ->where(fn ($q) => $q->whereNull('jam_selesai')->orWhere('jam_selesai', '>', today()))
            ->pluck('unit_id')
            ->flip();

        return $units->groupBy('jenis_unit')
            ->sortKeysDesc() // Light Vehicle di atas Bus
            ->map(function ($group) use ($p2h, $notReady) {
                $counts = ['layak' => 0, 'temuan' => 0, 'bd' => 0, 'tidak_ready' => 0, 'belum' => 0];
                foreach ($group as $unit) {
                    $status = $p2h[$unit->id] ?? ($notReady->has($unit->id) ? 'tidak_ready' : 'belum');
                    $counts[$status]++;
                }

                return [...$counts, 'total' => $group->count()];
            })
            ->all();
    }
}
