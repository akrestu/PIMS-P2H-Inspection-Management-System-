<?php

namespace App\Models;

use App\Enums\FindingStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class P2hFinding extends Model
{
    protected $fillable = [
        'p2h_checklist_answer_id', 'p2h_user_entry_id', 'unit_id', 'site_id',
        'tanggal_temuan', 'item_nama', 'kode_bahaya', 'keterangan',
        'tindakan_perbaikan', 'pic_user_id', 'target_selesai', 'status',
        'closed_at', 'closed_by', 'catatan_penutupan', 'foto_penutupan', 'overdue_notified_at',
    ];

    protected $casts = [
        'tanggal_temuan' => 'date',
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

        return static::query()
            ->whereHas('entry')
            ->whereDate('tanggal_temuan', '>', $until->copy()->subDays($windowDays))
            ->whereDate('tanggal_temuan', '<=', $until)
            ->selectRaw('unit_id, item_nama, COUNT(*) as total')
            ->groupBy('unit_id', 'item_nama')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->unit_id.'|'.$row->item_nama => (int) $row->total]);
    }

    public static function isRecurringCount(int $count): bool
    {
        return $count >= config('p2h.findings.recurring_threshold');
    }

    /**
     * Buat temuan dari jawaban checklist "Tidak Layak" (idempotent).
     * PIC default = PIC approver entry, bisa diubah admin/manager setelahnya.
     */
    public static function recordFromAnswer(P2hChecklistAnswer $answer, P2hUserEntry $entry, Unit $unit, $tanggal): self
    {
        return static::firstOrCreate(
            ['p2h_checklist_answer_id' => $answer->id],
            [
                'p2h_user_entry_id' => $entry->id,
                'unit_id' => $unit->id,
                'site_id' => $unit->site_id,
                'tanggal_temuan' => $tanggal,
                'item_nama' => $answer->item_nama,
                'kode_bahaya' => $answer->item_kode_bahaya,
                'keterangan' => $answer->keterangan,
                'pic_user_id' => $entry->pic_approver_id,
                'status' => FindingStatus::Open,
            ],
        );
    }

    public function answer(): BelongsTo
    {
        return $this->belongsTo(P2hChecklistAnswer::class, 'p2h_checklist_answer_id');
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

    /** Temuan belum selesai (open/progress) dan entry-nya masih aktif. */
    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->where('status', '!=', FindingStatus::Closed->value)->whereHas('entry');
    }
}
