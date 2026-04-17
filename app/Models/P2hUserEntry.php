<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class P2hUserEntry extends Model
{
    protected $fillable = [
        'p2h_session_id', 'user_id', 'user_slot', 'km_awal',
        'paraf_url', 'shift', 'submitted_at',
        'kondisi_akhir', 'justifikasi_kondisi',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
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

    public function getTidakLayakCountAttribute(): int
    {
        return $this->answers()->where('kondisi', 'Tidak Layak')->count();
    }

    /**
     * True jika kondisi_akhir berbeda dari rekomendasi kalkulasi P2H.
     */
    public function getIsOverrideAttribute(): bool
    {
        if ($this->kondisi_akhir === null) {
            return false;
        }

        $total = $this->answers->count();
        if ($total === 0) {
            return false;
        }

        $score = ($this->answers->where('kondisi', 'Layak')->count() / $total) * 100;
        $recommended = $score >= 80 ? 'Layak Pakai' : 'BD';

        return $this->kondisi_akhir !== $recommended;
    }
}
