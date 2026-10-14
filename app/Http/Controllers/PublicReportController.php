<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\P2hSession;
use App\Models\Site;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Support\FleetAvailability;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Rekap P2H bulanan read-only yang bisa dibuka tanpa login lewat link bertoken
 * (dibagikan ke grup WhatsApp). Token diatur admin di Pengaturan Aplikasi dan
 * bisa diganti/dinonaktifkan kapan saja. Nama driver tidak ditampilkan.
 */
class PublicReportController extends Controller
{
    public const JENIS = ['LV' => 'Light Vehicle', 'Bus' => 'Bus'];

    public function show(Request $request, string $token): Response
    {
        $expected = AppSetting::publicReportToken();
        abort_unless($expected !== null && hash_equals($expected, $token), 404);

        $validated = $request->validate([
            'bulan' => ['nullable', 'date_format:Y-m'],
            'jenis' => ['nullable', 'in:LV,Bus'],
            'site' => ['nullable', 'integer'],
        ]);

        $start = isset($validated['bulan'])
            ? Carbon::createFromFormat('Y-m', $validated['bulan'])->startOfMonth()
            : today()->startOfMonth();
        // Hanya bulan berjalan dan 12 bulan ke belakang
        $earliest = today()->startOfMonth()->subMonths(12);
        if ($start->greaterThan(today()) || $start->lessThan($earliest)) {
            $start = today()->startOfMonth();
        }
        $end = $start->copy()->endOfMonth();
        $lastDay = $end->copy()->min(today());
        $jenis = isset($validated['jenis']) ? self::JENIS[$validated['jenis']] : null;
        $sites = Site::active()->orderBy('name')->get(['id', 'name']);
        $site = isset($validated['site']) ? $sites->firstWhere('id', (int) $validated['site']) : null;

        $units = Unit::active()
            ->when($jenis, fn ($q) => $q->where('jenis_unit', $jenis))
            ->when($site, fn ($q) => $q->where('site_id', $site->id))
            ->get(['id', 'no_unit', 'jenis_unit'])
            ->sortBy(fn (Unit $u) => preg_replace('/\s+/', '', $u->no_unit), SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
        $unitIds = $units->pluck('id');

        // Kondisi harian dari P2H yang tidak ditolak: BD > ada temuan > layak
        $p2h = P2hSession::query()
            ->whereIn('unit_id', $unitIds)
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->whereHas('userEntries', fn ($q) => $q->notRejected())
            ->with(['userEntries' => fn ($q) => $q->notRejected()->select('id', 'p2h_session_id', 'kondisi_akhir')
                ->withCount(['answers as tidak_layak' => fn ($a) => $a->where('kondisi', 'Tidak Layak')])])
            ->get(['id', 'unit_id', 'tanggal'])
            ->mapWithKeys(function (P2hSession $s) {
                $entries = $s->userEntries;
                $status = $entries->contains('kondisi_akhir', 'BD') ? 'bd'
                    : ($entries->sum('tidak_layak') > 0 ? 'temuan' : 'layak');

                return [$s->unit_id.'|'.$s->tanggal->toDateString() => $status];
            });

        $downtimes = UnitDowntimeLog::whereIn('unit_id', $unitIds)
            ->inRange($start->toDateString(), $end->toDateString())
            ->get(['unit_id', 'tipe', 'jam_mulai', 'jam_selesai'])
            ->groupBy('unit_id');

        $dates = collect(CarbonPeriod::create($start, $end))->map(fn ($d) => $d->toDateString())->values();
        $lastDate = $lastDay->toDateString();

        $rows = $units->map(function (Unit $unit) use ($dates, $p2h, $downtimes, $lastDate) {
            $logs = $downtimes->get($unit->id, collect());
            $days = $dates->map(function (string $date) use ($unit, $p2h, $logs, $lastDate) {
                if ($date > $lastDate) {
                    return null; // hari yang belum lewat
                }
                if ($status = $p2h[$unit->id.'|'.$date] ?? null) {
                    return $status;
                }
                $dayStart = Carbon::parse($date)->startOfDay();
                $dayEnd = Carbon::parse($date)->endOfDay();
                $log = $logs->first(fn ($l) => $l->jam_mulai->lessThanOrEqualTo($dayEnd)
                    && ($l->jam_selesai === null || $l->jam_selesai->greaterThanOrEqualTo($dayStart)));

                // Tidak P2H karena unit sedang BD/PM/Servis vs memang tidak P2H
                return $log ? 'downtime' : 'kosong';
            })->values();

            return [
                'no_unit' => $unit->no_unit,
                'jenis_unit' => $unit->jenis_unit,
                'days' => $days,
                'hari_p2h' => $days->filter(fn ($s) => in_array($s, ['layak', 'temuan', 'bd'], true))->count(),
            ];
        });

        $perDay = $dates->map(fn ($date, $i) => $date > $lastDate
            ? null
            : $rows->filter(fn ($r) => in_array($r['days'][$i], ['layak', 'temuan', 'bd'], true))->count())->values();

        $months = collect(range(0, 12))
            ->map(fn ($i) => today()->startOfMonth()->subMonths($i))
            ->map(fn (CarbonInterface $m) => ['value' => $m->format('Y-m'), 'label' => $m->locale('id')->translatedFormat('F Y')]);

        return Inertia::render('public/p2h-report', [
            'token' => $token,
            'bulan' => $start->format('Y-m'),
            'bulanLabel' => $start->locale('id')->translatedFormat('F Y'),
            'jenis' => $validated['jenis'] ?? null,
            'site' => $site?->id,
            'siteName' => $site?->name,
            'sites' => $sites,
            'dates' => $dates->map(fn ($d) => ['date' => $d, 'day' => (int) substr($d, 8), 'sunday' => Carbon::parse($d)->isSunday()])->values(),
            'rows' => $rows,
            'perDay' => $perDay,
            'totalUnit' => $units->count(),
            'hariBerjalan' => $dates->filter(fn ($d) => $d <= $lastDate)->count(),
            'pa' => FleetAvailability::build($start, $lastDay, ['jenis_unit' => $jenis, 'site_id' => $site?->id])['summary']['pa_by_jenis'],
            'months' => $months,
            'updatedAt' => now()->locale('id')->translatedFormat('d F Y H:i'),
        ]);
    }
}
