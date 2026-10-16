<?php

namespace App\Support;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hSession;
use App\Models\UnitDowntimeLog;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Analitik kerusakan unit (pims-redesign Analitik-Desktop.png): item yang paling sering
 * "Tidak Layak", tren kerusakan kritis vs non-kritis per minggu, dan unit dengan
 * kerusakan terbanyak (+ downtime BD, MTTR, item utama, tren 4 minggu).
 * Satu kerusakan = satu jawaban checklist "Tidak Layak" dari entry yang tidak ditolak.
 */
class DamageAnalytics
{
    public static function build(int $weeks = 5, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        $end = today();
        $start = $end->copy()->startOfWeek()->subWeeks($weeks - 1);

        $answers = P2hChecklistAnswer::query()
            ->where('kondisi', 'Tidak Layak')
            ->whereHas('userEntry', fn ($q) => $q->notRejected()
                ->whereHas('session', fn ($s) => self::sessionScope($s, $start, $end, $siteId, $jenisUnit)))
            ->with(['userEntry:id,p2h_session_id', 'userEntry.session:id,unit_id,tanggal', 'userEntry.session.unit:id,no_unit,jenis_unit'])
            ->get(['id', 'p2h_user_entry_id', 'item_nama', 'item_kode_bahaya']);

        $rows = $answers->map(fn (P2hChecklistAnswer $a) => [
            'item' => trim((string) $a->item_nama),
            'kritis' => $a->item_kode_bahaya === 'AA',
            'unit_id' => $a->userEntry?->session?->unit_id,
            'no_unit' => $a->userEntry?->session?->unit?->no_unit,
            'week' => Carbon::parse($a->userEntry?->session?->tanggal)->startOfWeek()->toDateString(),
        ])->filter(fn ($r) => $r['unit_id']);

        $weekStarts = collect(range($weeks - 1, 0))->map(fn ($i) => $end->copy()->startOfWeek()->subWeeks($i));

        return [
            'range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'label' => 'M'.$weekStarts->first()->isoWeek().'–M'.$weekStarts->last()->isoWeek(),
            ],
            'total_p2h' => P2hSession::query()
                ->where(fn ($s) => self::sessionScope($s, $start, $end, $siteId, $jenisUnit))
                ->whereHas('userEntries', fn ($q) => $q->notRejected())
                ->count(),
            'items' => $rows->groupBy('item')
                ->map(fn (Collection $g, $item) => [
                    'item' => $item,
                    'jumlah' => $g->count(),
                    'kritis' => $g->contains('kritis', true),
                ])
                ->sortByDesc('jumlah')->take(8)->values(),
            'weekly' => $weekStarts->map(function (CarbonInterface $w) use ($rows, $end) {
                $inWeek = $rows->where('week', $w->toDateString());

                return [
                    'label' => 'M'.$w->isoWeek(),
                    'kritis' => $inWeek->where('kritis', true)->count(),
                    'non_kritis' => $inWeek->where('kritis', false)->count(),
                    'berjalan' => $w->copy()->endOfWeek()->greaterThan($end),
                ];
            })->values(),
            'units' => self::units($rows, $weekStarts, $start, $end),
        ];
    }

    private static function units(Collection $rows, Collection $weekStarts, CarbonInterface $start, CarbonInterface $end): Collection
    {
        $byUnit = $rows->groupBy('unit_id');
        $from = $start->copy()->startOfDay();
        $to = min($end->copy()->endOfDay(), now());

        $bd = UnitDowntimeLog::whereIn('unit_id', $byUnit->keys())
            ->where('tipe', 'BD')
            ->where('jam_mulai', '<', $to)
            ->where(fn ($q) => $q->whereNull('jam_selesai')->orWhere('jam_selesai', '>', $from))
            ->get(['unit_id', 'jam_mulai', 'jam_selesai'])
            ->groupBy('unit_id');

        return $byUnit->map(function (Collection $g, $unitId) use ($bd, $from, $to, $weekStarts) {
            $logs = $bd->get($unitId, collect());
            $clipped = $logs->map(function (UnitDowntimeLog $log) use ($from, $to) {
                $s = $log->jam_mulai->max($from);
                $e = ($log->jam_selesai ?? $to)->min($to);

                return $e->greaterThan($s) ? $s->diffInSeconds($e) / 3600 : 0;
            });
            $closed = $logs->whereNotNull('jam_selesai');

            return [
                'unit_id' => (int) $unitId,
                'no_unit' => $g->first()['no_unit'],
                'kerusakan' => $g->count(),
                'downtime' => $logs->isEmpty() ? null : round($clipped->sum(), 1),
                // Mean time to repair: rata-rata durasi BD yang sudah selesai
                'mttr' => $closed->isEmpty() ? null : round($closed->avg(fn ($l) => $l->jam_mulai->diffInSeconds($l->jam_selesai) / 3600), 1),
                'item_utama' => $g->countBy('item')->sortDesc()->keys()->take(2)->values(),
                'tren' => $weekStarts->slice(-4)->map(fn ($w) => $g->where('week', $w->toDateString())->count())->values(),
            ];
        })->sortByDesc('kerusakan')->take(10)->values();
    }

    private static function sessionScope($query, CarbonInterface $start, CarbonInterface $end, ?int $siteId, ?string $jenisUnit)
    {
        return $query->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->whereHas('unit', fn ($u) => $u
                ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
                ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit)));
    }
}
