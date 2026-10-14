<?php

namespace App\Http\Controllers;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hSession;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Support\FleetAvailability;
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

            // Rumus PA yang sama dengan Monitoring PA
            $pa = FleetAvailability::build($weekStart, $weekEnd)['summary']['fleet_actual_pa'];

            return ['label' => $label, 'pa' => $pa ?? 0];
        });

        return Inertia::render('dashboard/index', [
            'fleetToday' => $this->fleetToday(),
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
