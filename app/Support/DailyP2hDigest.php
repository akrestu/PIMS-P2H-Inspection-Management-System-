<?php

namespace App\Support;

use App\Models\P2hFinding;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Menyusun data P2H harian yang terstruktur dan deterministik.
 * Data ini sumber tunggal untuk template WhatsApp maupun narasi AI,
 * sehingga angka dan nama unit tidak pernah dikarang oleh AI.
 */
class DailyP2hDigest
{
    public static function build(CarbonInterface $date, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        // Pastikan tidak ada item Tidak Layak yang terlewat menjadi temuan
        P2hFinding::syncMissing();

        $unitScope = fn (Builder $q) => $q
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit));

        $sessions = P2hSession::query()
            ->whereDate('tanggal', $date)
            ->whereHas('unit', $unitScope)
            ->whereHas('userEntries')
            ->with([
                'unit',
                'userEntries' => fn ($q) => $q->orderBy('user_slot'),
                'userEntries.user:id,name',
                'userEntries.findings.pic:id,name',
                'userEntries.answers:id,p2h_user_entry_id,kondisi,item_kode_bahaya',
            ])
            ->get()
            ->sortBy(fn (P2hSession $s) => $s->unit?->no_unit)
            ->values();

        $recurrence = P2hFinding::recurrenceCounts($date);

        $units = $sessions->map(function (P2hSession $session) use ($recurrence, $date) {
            $entries = $session->userEntries;
            $findings = $entries->flatMap->findings;
            // Keputusan final unit = keputusan pada pengisian P2H terakhir hari itu
            $latest = $entries->last();
            $isBd = $latest?->kondisi_akhir === 'BD';
            $recommended = $latest?->recommendedKondisi();

            return [
                'no_unit' => $session->unit?->no_unit,
                'jenis_unit' => $session->unit?->jenis_unit,
                'no_lambung' => $session->unit?->no_lambung,
                'kondisi' => $isBd ? 'tidak_layak' : ($findings->isNotEmpty() ? 'temuan' : 'layak'),
                'kondisi_akhir' => $latest?->kondisi_akhir,
                'keputusan' => [
                    'final' => $latest?->kondisi_akhir,
                    'rekomendasi_sistem' => $recommended,
                    'berbeda_dari_rekomendasi' => $recommended !== null && $latest?->kondisi_akhir !== $recommended,
                    'alasan' => filled($latest?->justifikasi_kondisi) ? trim($latest->justifikasi_kondisi) : null,
                    'oleh' => $latest?->user?->name,
                ],
                'entries' => $entries->map(fn (P2hUserEntry $e) => [
                    'driver' => $e->user?->name,
                    'shift' => $e->shift,
                    'kondisi_akhir' => $e->kondisi_akhir,
                    'approval_status' => $e->approval_status,
                    'catatan' => $e->justifikasi_kondisi,
                ])->all(),
                'findings' => $findings->map(fn (P2hFinding $f) => self::mapFinding($f, $recurrence, $date))->values()->all(),
            ];
        });

        // Temuan hari-hari sebelumnya yang belum closed tetap dipantau progress-nya
        $carryOver = P2hFinding::query()
            ->unresolved()
            ->whereDate('tanggal_temuan', '<', $date)
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $jenisUnit)))
            ->with(['unit:id,no_unit,jenis_unit', 'pic:id,name'])
            ->orderBy('tanggal_temuan')
            ->get()
            ->map(fn (P2hFinding $f) => [
                ...self::mapFinding($f, $recurrence, $date),
                'no_unit' => $f->unit?->no_unit,
                'jenis_unit' => $f->unit?->jenis_unit,
                'tanggal_temuan' => $f->tanggal_temuan->toDateString(),
                'umur_hari' => (int) $f->tanggal_temuan->diffInDays($date),
            ])
            ->all();

        // Hanya unit yang perlu segera servis (lewat / mendekati jadwal) yang masuk laporan
        $service = collect(UnitUsageAnalytics::serviceForecast($siteId, $jenisUnit, $date))
            ->whereIn('status', ['overdue', 'due_soon'])
            ->values()
            ->all();

        return [
            'tanggal' => $date->toDateString(),
            'tanggal_label' => $date->copy()->locale('id')->translatedFormat('l, d F Y'),
            'site' => $siteId ? Site::find($siteId)?->name : null,
            'jenis_unit' => $jenisUnit,
            'stats' => [
                'sudah_p2h' => $units->count(),
                'unit_temuan' => $units->where('kondisi', 'temuan')->count(),
                'unit_tidak_layak' => $units->where('kondisi', 'tidak_layak')->count(),
                'temuan_hari_ini' => $units->sum(fn ($u) => count($u['findings'])),
                'temuan_carry_over' => count($carryOver),
                'temuan_overdue' => collect($carryOver)->concat($units->flatMap(fn ($u) => $u['findings']))->where('overdue', true)->count(),
                'servis_mendekat' => count($service),
            ],
            'units' => $units->all(),
            'carry_over' => $carryOver,
            'servis' => $service,
        ];
    }

    private static function mapFinding(P2hFinding $finding, Collection $recurrence, CarbonInterface $date): array
    {
        return [
            'id' => $finding->id,
            'item' => $finding->item_nama,
            'kode_bahaya' => $finding->kode_bahaya,
            'keterangan' => $finding->keterangan,
            'tindakan' => $finding->tindakan_perbaikan,
            'pic' => $finding->pic?->name,
            'target' => $finding->target_selesai?->toDateString(),
            'status' => $finding->status->value,
            'overdue' => $finding->isOverdue($date),
            'berulang' => (fn (int $n) => P2hFinding::isRecurringCount($n) ? $n : null)(
                $recurrence->get($finding->unit_id.'|'.$finding->item_nama, 0)
            ),
        ];
    }
}
