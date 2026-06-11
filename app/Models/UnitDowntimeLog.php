<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitDowntimeLog extends Model
{
    protected $fillable = [
        'unit_id', 'tipe', 'jam_mulai', 'jam_selesai', 'keterangan', 'created_by',
    ];

    protected $casts = [
        'jam_mulai'   => 'datetime',
        'jam_selesai' => 'datetime',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Durasi dalam jam (float). Null jika masih ongoing.
     */
    public function getDurationHoursAttribute(): ?float
    {
        if ($this->jam_selesai === null) {
            return null;
        }

        $minutes = $this->jam_selesai->diffInMinutes($this->jam_mulai, absolute: true);
        return round($minutes / 60, 2);
    }

    /**
     * Hanya log yang sudah selesai (jam_selesai tidak null).
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereNotNull('jam_selesai');
    }

    /**
     * Log yang overlap dengan range tanggal (dari $from 00:00 sampai $to 23:59).
     */
    public function scopeInRange(Builder $query, string $from, string $to): Builder
    {
        return $query
            ->where('jam_mulai', '<=', $to . ' 23:59:59')
            ->where(function (Builder $q) use ($from) {
                $q->whereNull('jam_selesai')
                  ->orWhere('jam_selesai', '>=', $from . ' 00:00:00');
            });
    }
}
