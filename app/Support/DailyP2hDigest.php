<?php

namespace App\Support;

use App\Models\P2hFinding;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Menyusun data P2H pada rentang tanggal yang dipilih, terstruktur dan deterministik.
 * Hanya P2H (dan temuannya) yang masuk dalam rentang tersebut yang ditampilkan.
 * Data ini sumber tunggal untuk template WhatsApp maupun narasi AI,
 * sehingga angka dan nama unit tidak pernah dikarang oleh AI.
 */
class DailyP2hDigest
{
    public static function build(CarbonInterface $start, ?CarbonInterface $end = null, ?int $siteId = null, ?string $jenisUnit = null): array
    {
        $end ??= $start;

        // Pastikan tidak ada item Tidak Layak yang terlewat menjadi temuan
        P2hFinding::syncMissing($start);

        $unitScope = fn (Builder $q) => $q
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId))
            ->when($jenisUnit, fn ($q) => $q->where('jenis_unit', $jenisUnit));

        // Entry yang ditolak approver tidak dianggap sebagai hasil P2H
        $notRejected = fn ($q) => $q->where(fn ($q) => $q->whereNull('approval_status')->orWhere('approval_status', '!=', 'rejected'));

        $sessions = P2hSession::query()
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->whereHas('unit', $unitScope)
            ->whereHas('userEntries', $notRejected)
            ->with([
                'unit',
                'userEntries' => fn ($q) => $notRejected($q)->orderBy('user_slot'),
                'userEntries.user:id,name',
                'userEntries.answers:id,p2h_user_entry_id,p2h_finding_id,kondisi,item_nama,item_kode_bahaya',
                'userEntries.answers.finding.pic:id,name',
            ])
            ->get()
            ->sortBy(fn (P2hSession $s) => [$s->tanggal->toDateString(), $s->unit?->no_unit])
            ->values();

        $recurrence = P2hFinding::recurrenceCounts($end);

        $units = $sessions->map(function (P2hSession $session) use ($recurrence, $end) {
            $entries = $session->userEntries;
            // Temuan diambil dari item "Tidak Layak" pada P2H hari itu — termasuk temuan
            // gabungan yang pertama kali tercatat di hari sebelumnya dan masih dilaporkan.
            // Item sama dari beberapa shift di hari yang sama cukup tampil sekali.
            $findings = $entries
                ->flatMap(fn (P2hUserEntry $e) => $e->answers->where('kondisi', 'Tidak Layak'))
                ->map(fn ($answer) => $answer->finding)
                ->filter()
                ->unique('id')
                ->reverse()
                ->unique(fn (P2hFinding $f) => mb_strtolower(trim((string) $f->item_nama)))
                ->reverse()
                ->values();
            // Keputusan final unit = keputusan pada pengisian P2H terakhir hari itu
            $latest = $entries->last();
            $isBd = $latest?->kondisi_akhir === 'BD';
            $recommended = $latest?->recommendedKondisi();

            return [
                'tanggal' => $session->tanggal->toDateString(),
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
                'findings' => $findings->map(fn (P2hFinding $f) => self::mapFinding($f, $recurrence, $end))->values()->all(),
            ];
        });

        // Hanya unit yang perlu segera servis (lewat / mendekati jadwal) yang masuk laporan
        // Prediksi servis membaca riwayat KM setahun → di-cache 10 menit
        $service = Cache::remember(
            "p2h_service_due:{$siteId}:{$jenisUnit}:{$end->toDateString()}",
            now()->addMinutes(10),
            fn () => collect(UnitUsageAnalytics::serviceForecast($siteId, $jenisUnit, $end))
                ->whereIn('status', ['overdue', 'due_soon'])
                ->values()
                ->all(),
        );

        $label = fn (CarbonInterface $d) => $d->copy()->locale('id')->translatedFormat('l, d F Y');
        $allFindings = $units->flatMap(fn ($u) => $u['findings']);

        return [
            'tanggal_mulai' => $start->toDateString(),
            'tanggal_selesai' => $end->toDateString(),
            'tanggal_label' => $start->isSameDay($end)
                ? $label($start)
                : $start->copy()->locale('id')->translatedFormat('d M Y').' – '.$end->copy()->locale('id')->translatedFormat('d M Y'),
            'multi_hari' => ! $start->isSameDay($end),
            'site' => $siteId ? Site::find($siteId)?->name : null,
            'jenis_unit' => $jenisUnit,
            'stats' => [
                'sudah_p2h' => $units->count(),
                'unit_temuan' => $units->where('kondisi', 'temuan')->count(),
                'unit_tidak_layak' => $units->where('kondisi', 'tidak_layak')->count(),
                'temuan' => $allFindings->count(),
                'temuan_belum_selesai' => $allFindings->where('status', '!=', 'closed')->count(),
                'temuan_overdue' => $allFindings->where('overdue', true)->count(),
                'servis_mendekat' => count($service),
            ],
            'units' => $units->all(),
            'servis' => $service,
        ];
    }

    private static function mapFinding(P2hFinding $finding, Collection $recurrence, CarbonInterface $asOf): array
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
            'overdue' => $finding->isOverdue(),
            'berulang' => $finding->recurringCount($recurrence),
        ];
    }
}
