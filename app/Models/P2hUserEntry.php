<?php

namespace App\Models;

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
        'approver_signature_url',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at'  => 'datetime',
    ];

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

    public function fuelLog(): HasOne
    {
        return $this->hasOne(P2hFuelLog::class);
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

    public function getTidakLayakCountAttribute(): int
    {
        return $this->answers()->where('kondisi', 'Tidak Layak')->count();
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
