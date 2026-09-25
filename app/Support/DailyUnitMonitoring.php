<?php

namespace App\Support;

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * Monitoring harian per unit (LV & Bus): satu baris = satu unit di satu tanggal,
 * berisi status pengisian P2H per shift, temuan hari itu beserta tindak lanjutnya,
 * KM terakhir, dan total BBM. Dipakai halaman web dan export Excel agar isinya sama.
 *
 * Entry yang ditolak approver tidak dihitung; entry yang masih menunggu approval
 * dihitung tetapi ditandai.
 */
class DailyUnitMonitoring
{
    public const MAX_DAYS = 31;

    /**
     * @param  array{site_id?: ?int, jenis_unit?: ?string, search?: ?string, status?: ?string}  $filters
     * @return array{rows: list<array<string, mixed>>, summary: array<string, int|float>}
     */
    public static function build(CarbonInterface $start, CarbonInterface $end, array $filters = []): array
    {
        $units = Unit::active()
            ->with('site:id,name')
            ->when($filters['site_id'] ?? null, fn ($q, $siteId) => $q->where('site_id', $siteId))
            ->when($filters['jenis_unit'] ?? null, fn ($q, $jenis) => $q->where('jenis_unit', $jenis))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q
                ->where('no_unit', 'like', "%{$search}%")
                ->orWhere('no_lambung', 'like', "%{$search}%")))
            ->orderBy('jenis_unit')
            ->orderBy('no_unit')
            ->get(['id', 'no_unit', 'no_lambung', 'jenis_unit', 'department', 'site_id']);

        $sessions = P2hSession::query()
            ->whereIn('unit_id', $units->pluck('id'))
            ->whereDate('tanggal', '>=', $start)
            ->whereDate('tanggal', '<=', $end)
            ->with([
                'userEntries' => fn ($q) => $q->notRejected()->orderBy('submitted_at'),
                'userEntries.user:id,name',
                'userEntries.fuelLog',
                'userEntries.answers' => fn ($q) => $q->where('kondisi', 'Tidak Layak'),
                'userEntries.answers.finding.pic:id,name',
            ])
            ->get()
            ->keyBy(fn (P2hSession $s) => $s->unit_id.'|'.$s->tanggal->toDateString());

        // Tanggal terbaru di atas
        $dates = collect(CarbonPeriod::create($start, $end))->map(fn ($d) => $d->toDateString())->reverse();

        $rows = [];
        foreach ($dates as $date) {
            foreach ($units as $unit) {
                $row = self::row($unit, $date, $sessions->get($unit->id.'|'.$date));

                if (self::matchesStatus($row, $filters['status'] ?? null)) {
                    $rows[] = $row;
                }
            }
        }

        return ['rows' => $rows, 'summary' => self::summary($rows)];
    }

    /** @return array<string, mixed> */
    private static function row(Unit $unit, string $date, ?P2hSession $session): array
    {
        /** @var Collection<int, P2hUserEntry> $entries */
        $entries = $session?->userEntries ?? collect();

        $findings = $entries
            ->flatMap(fn (P2hUserEntry $e) => $e->answers)
            // Satu temuan bisa dilaporkan beberapa shift di hari yang sama → tampil sekali
            ->unique(fn ($a) => $a->p2h_finding_id ?? 'answer-'.$a->id)
            ->map(fn ($a) => [
                'item' => $a->item_nama,
                'kode_bahaya' => $a->item_kode_bahaya,
                'keterangan' => $a->keterangan,
                'status' => $a->finding?->status?->value,
                'status_label' => $a->finding?->status?->label(),
                'tindakan' => $a->finding?->tindakan_perbaikan,
                'pic' => $a->finding?->pic?->name,
                'target_selesai' => $a->finding?->target_selesai?->toDateString(),
            ])
            ->values()
            ->all();

        // KM terakhir hari itu: KM akhir → KM saat isi BBM → KM awal, dari entry paling akhir yang punya angka
        $km = $entries->reverse()
            ->map(fn (P2hUserEntry $e) => $e->hm_km_akhir ?? $e->fuelLog?->km_unit ?? $e->km_awal)
            ->first(fn ($value) => $value !== null);

        $liter = round((float) $entries->sum(fn (P2hUserEntry $e) => (float) ($e->fuelLog?->jumlah_liter ?? 0)), 2);

        return [
            'tanggal' => $date,
            'unit_id' => $unit->id,
            'no_unit' => $unit->no_unit,
            'no_lambung' => $unit->no_lambung,
            'jenis_unit' => $unit->jenis_unit,
            'site' => $unit->site?->name,
            'session_id' => $entries->isNotEmpty() ? $session->id : null,
            'terisi' => $entries->isNotEmpty(),
            'shifts' => $entries->pluck('shift')->filter()->unique()->values()->all(),
            'drivers' => $entries->map(fn (P2hUserEntry $e) => $e->user?->name)->filter()->unique()->values()->all(),
            'pending_approval' => $entries->contains(fn (P2hUserEntry $e) => $e->approval_status === 'pending'),
            'kondisi' => $entries->isEmpty() ? null : ($entries->contains('kondisi_akhir', 'BD') ? 'BD' : 'Layak Pakai'),
            'temuan' => $findings,
            'km' => $km,
            'bbm_liter' => $liter > 0 ? $liter : null,
        ];
    }

    private static function matchesStatus(array $row, ?string $status): bool
    {
        return match ($status) {
            'terisi' => $row['terisi'],
            'kosong' => ! $row['terisi'],
            'temuan' => $row['temuan'] !== [],
            'bbm' => $row['bbm_liter'] !== null,
            default => true,
        };
    }

    /** @param  list<array<string, mixed>>  $rows */
    private static function summary(array $rows): array
    {
        $rows = collect($rows);

        return [
            'total' => $rows->count(),
            'terisi' => $rows->where('terisi', true)->count(),
            'kosong' => $rows->where('terisi', false)->count(),
            'temuan' => $rows->sum(fn ($r) => count($r['temuan'])),
            'bd' => $rows->where('kondisi', 'BD')->count(),
            'bbm_liter' => round((float) $rows->sum('bbm_liter'), 2),
        ];
    }
}
