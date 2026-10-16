<?php

namespace App\Support;

use App\Enums\FindingStatus;
use App\Models\P2hFinding;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Status P2H per unit untuk satu hari (Dashboard & Monitoring P2H,
 * pims-redesign/docs/screens/manager-ops.md). Hanya membaca data — aturan
 * hitung sama dengan Kondisi Armada: entry yang tidak ditolak dihitung masuk.
 */
class TodayP2hStatus
{
    /** Urutan default tabel: yang butuh perhatian di atas. */
    private const ORDER = ['tidak-layak' => 0, 'belum' => 1, 'menunggu' => 2, 'layak' => 3, 'tidak-wajib' => 4];

    private const DOWN_STATUS = ['BD' => 'bd', 'PM' => 'pm', 'Servis Berkala' => 'servis'];

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array<string, mixed>, fleet: array<string, mixed>}
     */
    public static function build(?CarbonInterface $date = null, ?Collection $units = null): array
    {
        $date ??= today();
        $now = now();
        $units ??= Unit::active()->with('users:id,name')->orderBy('no_unit')->get();
        $unitIds = $units->pluck('id');

        $sessions = P2hSession::query()
            ->whereDate('tanggal', $date)
            ->whereIn('unit_id', $unitIds)
            ->with(['userEntries' => fn ($q) => $q->notRejected()
                ->with('user:id,name')
                ->withCount(['answers as tidak_layak' => fn ($a) => $a->where('kondisi', 'Tidak Layak')])])
            ->get()
            ->keyBy('unit_id');

        // Status operasional saat ini = log downtime yang masih berjalan
        $downtimes = UnitDowntimeLog::whereIn('unit_id', $unitIds)
            ->where('jam_mulai', '<=', $now)
            ->where(fn ($q) => $q->whereNull('jam_selesai')->orWhere('jam_selesai', '>', $now))
            ->orderByDesc('jam_mulai')
            ->get()
            ->unique('unit_id')
            ->keyBy('unit_id');

        $rows = $units->map(function (Unit $unit) use ($sessions, $downtimes, $now) {
            /** @var Collection<int, P2hUserEntry> $entries */
            $entries = $sessions->get($unit->id)?->userEntries ?? collect();
            $latest = $entries->sortByDesc('submitted_at')->first();
            $downtime = $downtimes->get($unit->id);
            $unitStatus = $downtime ? (self::DOWN_STATUS[$downtime->tipe] ?? 'bd') : 'ready';

            if ($entries->isEmpty()) {
                $p2h = $unitStatus === 'ready' ? 'belum' : 'tidak-wajib';
            } else {
                $p2h = $entries->contains('kondisi_akhir', 'BD') ? 'tidak-layak' : 'layak';
            }

            $pending = $entries->firstWhere('approval_status', 'pending');
            $approval = null;
            if ($pending) {
                $minutes = (int) $pending->submitted_at?->diffInMinutes($now);
                $approval = ['status' => $pending->escalated_at ? 'eskalasi' : 'menunggu', 'minutes' => $minutes];
            } elseif ($entries->contains('approval_status', 'approved')) {
                $approval = ['status' => 'disetujui', 'minutes' => null];
            }

            return [
                'unit_id' => $unit->id,
                'no_unit' => $unit->no_unit,
                'jenis_unit' => $unit->jenis_unit,
                'driver' => $latest?->user?->name ?? $unit->users->first()?->name,
                'drivers' => $entries->map(fn ($e) => [
                    'name' => $e->user?->name,
                    'time' => $e->submitted_at?->format('H:i'),
                ])->values(),
                'p2h' => $p2h,
                'waktu' => $entries->min('submitted_at')?->format('H:i'),
                'tidak_layak' => (int) $entries->sum('tidak_layak'),
                'approval' => $approval,
                'unit_status' => $unitStatus,
                'unit_note' => $downtime?->keterangan,
                'unit_since' => $downtime?->jam_mulai?->toIso8601String(),
                // Driver yang ditugaskan ke unit (penerima tombol "Ingatkan")
                'assigned' => $unit->users->pluck('name')->values(),
                'session_id' => $sessions->get($unit->id)?->id,
                'pending_entry_id' => $pending?->id,
            ];
        })
            ->sortBy(fn ($r) => [self::ORDER[$r['approval'] && $r['approval']['status'] !== 'disetujui' && $r['p2h'] === 'layak' ? 'menunggu' : $r['p2h']], $r['no_unit']])
            ->values();

        $required = $rows->where('p2h', '!=', 'tidak-wajib');
        $submitted = $rows->whereIn('p2h', ['layak', 'tidak-layak']);
        $waiting = $rows->filter(fn ($r) => in_array($r['approval']['status'] ?? null, ['menunggu', 'eskalasi'], true));

        $statusCounts = ['ready' => 0, 'bd' => 0, 'pm' => 0, 'servis' => 0];
        foreach ($rows as $r) {
            $statusCounts[$r['unit_status']]++;
        }

        $openFindings = P2hFinding::unresolved()->whereIn('unit_id', $unitIds)->get(['id', 'target_selesai', 'status']);

        return [
            'rows' => $rows->all(),
            'summary' => [
                'submitted' => $submitted->count(),
                'required' => $required->count(),
                'layak' => $rows->where('p2h', 'layak')->count(),
                'tidak_layak' => $rows->where('p2h', 'tidak-layak')->pluck('no_unit')->values(),
                'belum' => $rows->where('p2h', 'belum')->count(),
                'waiting' => $waiting->count(),
                'escalated' => $waiting->where('approval.status', 'eskalasi')->count(),
                'findings_open' => $openFindings->count(),
                'findings_overdue' => $openFindings->filter(fn (P2hFinding $f) => $f->status !== FindingStatus::Closed && $f->isOverdue())->count(),
            ],
            'fleet' => [
                'total' => $rows->count(),
                'counts' => $statusCounts,
                'not_ready' => $rows->where('unit_status', '!=', 'ready')
                    ->sortBy(fn ($r) => array_search($r['unit_status'], ['bd', 'pm', 'servis'], true))
                    ->map(fn ($r) => [
                        'no_unit' => $r['no_unit'],
                        'status' => $r['unit_status'],
                        'note' => $r['unit_note'],
                        'since' => $r['unit_since'],
                    ])->values(),
            ],
        ];
    }

    /**
     * Kepatuhan harian armada (persen unit aktif yang P2H) — definisi sama
     * dengan halaman Kepatuhan: unit dengan P2H sah ÷ unit aktif.
     *
     * @return list<array{date: string, pct: float|null}>
     */
    public static function complianceTrend(int $days = 30, ?Collection $units = null): array
    {
        $units ??= Unit::active()->get(['id']);
        $total = $units->count();
        $from = today()->subDays($days - 1);

        $filled = P2hSession::query()
            ->whereDate('tanggal', '>=', $from)
            ->whereDate('tanggal', '<=', today())
            ->whereIn('unit_id', $units->pluck('id'))
            ->whereHas('userEntries', fn ($q) => $q->operational())
            ->selectRaw('date(tanggal) as d, count(distinct unit_id) as n')
            ->groupBy('d')
            ->pluck('n', 'd');

        return collect(range(0, $days - 1))->map(function (int $i) use ($from, $filled, $total) {
            $d = $from->copy()->addDays($i)->toDateString();

            return ['date' => $d, 'pct' => $total > 0 ? round(($filled[$d] ?? 0) / $total * 100, 1) : null];
        })->all();
    }
}
