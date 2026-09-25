<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class P2hUserEntry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'p2h_session_id', 'user_id', 'user_slot', 'lokasi_kerja', 'km_awal', 'hm_km_akhir',
        'paraf_url', 'shift', 'submitted_at',
        'kondisi_akhir', 'justifikasi_kondisi',
        'approval_status', 'pic_approver_id', 'approver_id', 'approved_at', 'catatan_approval',
        'approver_signature_url', 'escalated_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'escalated_at' => 'datetime',
    ];

    /**
     * Waktu berakhirnya shift entry ini: jam akhir shift pertama setelah submit.
     * Dipakai sebagai batas respons PIC sebelum approval dieskalasi ke admin.
     */
    public function shiftEndsAt(): ?CarbonInterface
    {
        $endTime = config("p2h.approval.shift_end_times.{$this->shift}");

        if (! $endTime || ! $this->submitted_at) {
            return null;
        }

        $end = $this->submitted_at->copy()->setTimeFromTimeString($endTime);

        return $end->lessThanOrEqualTo($this->submitted_at) ? $end->addDay() : $end;
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(P2hSession::class, 'p2h_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(P2hChecklistAnswer::class);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(P2hFinding::class);
    }

    public function fuelLog(): HasOne
    {
        return $this->hasOne(P2hFuelLog::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(P2hAttachment::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_approver_id');
    }

    /** Entry ini sudah dianggap sah (tidak perlu approval atau sudah approved) */
    public function isValid(): bool
    {
        return $this->approval_status === null || $this->approval_status === 'approved';
    }

    /** Entry yang tidak ditolak approver (sah atau masih menunggu approval). */
    public function scopeNotRejected(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('approval_status')
                ->orWhere('approval_status', '!=', 'rejected');
        });
    }

    /** Entry yang sudah sah untuk perhitungan operasional dan laporan. */
    public function scopeOperational(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('approval_status')
                ->orWhere('approval_status', 'approved');
        });
    }

    public function getTidakLayakCountAttribute(): int
    {
        return $this->answers()->where('kondisi', 'Tidak Layak')->count();
    }

    /**
     * Rekomendasi sistem dari hasil checklist (aturan sama dengan form P2H):
     * BD bila ada item AA Tidak Layak atau skor Layak < 80%.
     * Memakai snapshot kode bahaya di jawaban agar tidak perlu query tambahan.
     */
    public function recommendedKondisi(): ?string
    {
        $answers = $this->answers;
        $total = $answers->count();

        if ($total === 0) {
            return null;
        }

        $hasAACritical = $answers->contains(fn ($a) => $a->kondisi === 'Tidak Layak' && $a->item_kode_bahaya === 'AA');
        $score = ($answers->where('kondisi', 'Layak')->count() / $total) * 100;

        return ($hasAACritical || $score < 80) ? 'BD' : 'Layak Pakai';
    }

    public function getIsOverrideAttribute(): bool
    {
        if ($this->kondisi_akhir === null) {
            return false;
        }

        // Pastikan inspectionItem sudah di-eager-load sebelum mengakses accessor ini.
        // Jika belum, load sekarang untuk menghindari N+1 yang tersebar di caller.
        if ($this->relationLoaded('answers') && $this->answers->isNotEmpty()
            && ! $this->answers->first()->relationLoaded('inspectionItem')) {
            $this->load('answers.inspectionItem');
        }

        $total = $this->answers->count();
        if ($total === 0) {
            return false;
        }

        $hasAACritical = $this->answers->contains(function ($answer) {
            return $answer->kondisi === 'Tidak Layak'
                && $answer->inspectionItem?->kode_bahaya === 'AA';
        });

        $score = ($this->answers->where('kondisi', 'Layak')->count() / $total) * 100;
        $recommended = ($hasAACritical || $score < 80) ? 'BD' : 'Layak Pakai';

        return $this->kondisi_akhir !== $recommended;
    }
}
