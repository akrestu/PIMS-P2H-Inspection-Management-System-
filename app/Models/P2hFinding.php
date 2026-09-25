<?php

namespace App\Models;

use App\Enums\FindingStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class P2hFinding extends Model
{
    protected $fillable = [
        'p2h_checklist_answer_id', 'p2h_user_entry_id', 'unit_id', 'site_id',
        'tanggal_temuan', 'item_nama', 'kode_bahaya', 'keterangan',
        'tindakan_perbaikan', 'pic_user_id', 'target_selesai', 'status',
        'closed_at', 'closed_by', 'catatan_penutupan', 'foto_penutupan', 'overdue_notified_at',
        'jumlah_laporan', 'terakhir_dilaporkan',
    ];

    protected $casts = [
        'tanggal_temuan' => 'date',
        'terakhir_dilaporkan' => 'date',
        'target_selesai' => 'date',
        'closed_at' => 'datetime',
        'overdue_notified_at' => 'datetime',
        'status' => FindingStatus::class,
    ];

    /** Belum closed dan sudah melewati target selesai. */
    public function isOverdue(?CarbonInterface $asOf = null): bool
    {
        return $this->status !== FindingStatus::Closed
            && $this->target_selesai !== null
            && $this->target_selesai->lt(($asOf ?? today())->copy()->startOfDay());
    }

    /**
     * Jumlah kemunculan temuan per "unit_id|item_nama" dalam jendela hari terakhir
     * s/d $until. Satu query untuk semua unit — dipakai penanda "temuan berulang".
     *
     * @return Collection<string, int>
     */
    public static function recurrenceCounts(CarbonInterface $until, ?int $windowDays = null): Collection
    {
        $windowDays ??= config('p2h.findings.recurring_window_days');

        return static::occurrenceCounts($until->copy()->subDays($windowDays - 1), $until);
    }

    /**
     * Berapa HARI item "Tidak Layak" dilaporkan per "unit_id|item_nama" dalam
     * rentang tanggal. Dihitung dari jawaban checklist (bukan dari record temuan,
     * karena satu temuan bisa menampung banyak laporan). Beberapa shift di hari
     * yang sama = 1 kali. Entry ditolak / dihapus dan sesi terhapus tidak dihitung.
     *
     * @return Collection<string, int>
     */
    public static function occurrenceCounts(CarbonInterface $start, CarbonInterface $end): Collection
    {
        return DB::table('p2h_checklist_answers as a')
            ->join('p2h_user_entries as e', 'e.id', '=', 'a.p2h_user_entry_id')
            ->join('p2h_sessions as s', 's.id', '=', 'e.p2h_session_id')
            ->where('a.kondisi', 'Tidak Layak')
            ->whereNull('e.deleted_at')
            ->whereNull('s.deleted_at')
            ->where(fn ($q) => $q->whereNull('e.approval_status')->orWhere('e.approval_status', '!=', 'rejected'))
            ->whereDate('s.tanggal', '>=', $start)
            ->whereDate('s.tanggal', '<=', $end)
            // Nama item dinormalkan (huruf kecil, tanpa spasi tepi) agar "APAR" = "apar "
            ->selectRaw('s.unit_id, LOWER(TRIM(a.item_nama)) as item_key, COUNT(DISTINCT s.tanggal) as total')
            ->groupByRaw('s.unit_id, LOWER(TRIM(a.item_nama))')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->unit_id.'|'.$row->item_key => (int) $row->total]);
    }

    /** Kunci pencarian hasil occurrenceCounts/recurrenceCounts untuk unit & item. */
    public static function recurrenceKey(int $unitId, ?string $item): string
    {
        return $unitId.'|'.mb_strtolower(trim((string) $item));
    }

    /** Jumlah hari berulang temuan ini (null bila di bawah ambang "berulang"). */
    public function recurringCount(Collection $recurrence): ?int
    {
        $count = $recurrence->get(static::recurrenceKey($this->unit_id, $this->item_nama), 0);

        return static::isRecurringCount($count) ? $count : null;
    }

    public static function isRecurringCount(int $count): bool
    {
        return $count >= config('p2h.findings.recurring_threshold');
    }

    /**
     * Catat jawaban "Tidak Layak" sebagai temuan (idempotent).
     *
     * Bila unit yang sama masih punya temuan TERBUKA untuk item yang sama, laporan
     * ini digabung ke temuan tersebut (jumlah laporan +1, keterangan diperbarui)
     * sehingga satu kerusakan cukup ditindaklanjuti dan ditutup sekali. Temuan yang
     * sudah closed tidak digabung: kerusakan yang muncul lagi menjadi temuan baru.
     * PIC default = PIC approver entry, bisa diubah admin/manager setelahnya.
     */
    public static function recordFromAnswer(P2hChecklistAnswer $answer, P2hUserEntry $entry, Unit $unit, $tanggal): self
    {
        if ($answer->p2h_finding_id && ($linked = static::find($answer->p2h_finding_id))) {
            return $linked;
        }

        $tanggal = Carbon::parse($tanggal)->startOfDay();

        return DB::transaction(function () use ($answer, $entry, $unit, $tanggal) {
            // Kunci baris unit agar dua submit bersamaan untuk unit & item yang sama
            // tidak sama-sama membuat temuan baru (lockForUpdate pada hasil kosong tidak mengunci)
            Unit::withTrashed()->whereKey($unit->id)->lockForUpdate()->first();

            $open = static::query()
                ->unresolved()
                ->where('unit_id', $unit->id)
                ->whereRaw('LOWER(TRIM(item_nama)) = ?', [mb_strtolower(trim((string) $answer->item_nama))])
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if ($open) {
                $isNewer = $open->terakhir_dilaporkan === null || $tanggal->gte($open->terakhir_dilaporkan);

                $open->forceFill([
                    'jumlah_laporan' => $open->jumlah_laporan + 1,
                    'terakhir_dilaporkan' => $isNewer ? $tanggal : $open->terakhir_dilaporkan,
                    'tanggal_temuan' => $tanggal->lt($open->tanggal_temuan) ? $tanggal : $open->tanggal_temuan,
                    // Keterangan mengikuti laporan terbaru; kode bahaya ikut naik bila jadi AA
                    'keterangan' => $isNewer && filled($answer->keterangan) ? $answer->keterangan : $open->keterangan,
                    'kode_bahaya' => $answer->item_kode_bahaya === 'AA' ? 'AA' : $open->kode_bahaya,
                    'pic_user_id' => $open->pic_user_id ?? $entry->pic_approver_id,
                ])->save();

                $finding = $open;
            } else {
                $finding = static::create([
                    'p2h_checklist_answer_id' => $answer->id,
                    'p2h_user_entry_id' => $entry->id,
                    'unit_id' => $unit->id,
                    'site_id' => $unit->site_id,
                    'tanggal_temuan' => $tanggal,
                    'terakhir_dilaporkan' => $tanggal,
                    'jumlah_laporan' => 1,
                    'item_nama' => $answer->item_nama,
                    'kode_bahaya' => $answer->item_kode_bahaya,
                    'keterangan' => $answer->keterangan,
                    'pic_user_id' => $entry->pic_approver_id,
                    'status' => FindingStatus::Open,
                ]);
            }

            $answer->forceFill(['p2h_finding_id' => $finding->id])->saveQuietly();

            return $finding;
        });
    }

    /**
     * Buat temuan untuk setiap jawaban "Tidak Layak" (entry masih aktif) yang
     * belum punya temuan — misalnya data P2H sebelum fitur temuan ada.
     * Satu query ringan bila tidak ada yang terlewat.
     */
    public static function syncMissing(?CarbonInterface $since = null): int
    {
        $created = 0;

        P2hChecklistAnswer::query()
            ->where('kondisi', 'Tidak Layak')
            ->whereNull('p2h_finding_id')
            ->whereHas('userEntry.session', fn ($q) => $q->when($since, fn ($q) => $q->whereDate('tanggal', '>=', $since)))
            ->with('userEntry.session.unit')
            // chunkById berurutan id (kronologis) → laporan lama & baru tergabung dengan benar
            ->chunkById(200, function ($answers) use (&$created) {
                foreach ($answers as $answer) {
                    $entry = $answer->userEntry;

                    if ($entry?->session?->unit) {
                        static::recordFromAnswer($answer, $entry, $entry->session->unit, $entry->session->tanggal);
                        $created++;
                    }
                }
            });

        return $created;
    }

    /**
     * Sinkronisasi ringan untuk halaman laporan: hanya 60 hari terakhir dan
     * paling sering sekali per 10 menit. Temuan baru sudah dibuat otomatis oleh
     * event model; ini hanya jaring pengaman (data lama tercakup oleh command backfill).
     */
    public static function syncRecent(): void
    {
        if (Cache::add('p2h_findings_sync_recent', true, now()->addMinutes(10))) {
            static::syncMissing(today()->subDays(60));
        }
    }

    /** Jawaban checklist pertama yang memunculkan temuan ini. */
    public function answer(): BelongsTo
    {
        return $this->belongsTo(P2hChecklistAnswer::class, 'p2h_checklist_answer_id');
    }

    /** Semua laporan "Tidak Layak" yang tergabung dalam temuan ini. */
    public function answers(): HasMany
    {
        return $this->hasMany(P2hChecklistAnswer::class, 'p2h_finding_id');
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(P2hUserEntry::class, 'p2h_user_entry_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class)->withTrashed();
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Temuan yang masih sah: minimal SATU laporan yang tergabung di dalamnya berasal
     * dari entry & sesi P2H yang tidak dihapus dan tidak ditolak approver. Temuan
     * gabungan tetap terlacak meski laporan pertamanya ditolak/dihapus.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereHas('answers.userEntry', fn (Builder $entry) => $entry
            ->whereHas('session')
            ->where(fn (Builder $q) => $q->whereNull('approval_status')->orWhere('approval_status', '!=', 'rejected')));
    }

    /** Temuan aktif yang belum selesai (open/progress). */
    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->active()->where('status', '!=', FindingStatus::Closed->value);
    }
}
