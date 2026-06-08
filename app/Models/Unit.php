<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $fillable = ['no_unit', 'jenis_unit', 'no_lambung', 'status'];

    public function p2hSessions(): HasMany
    {
        return $this->hasMany(P2hSession::class);
    }

    public function downtimeLogs(): HasMany
    {
        return $this->hasMany(UnitDowntimeLog::class);
    }

    public function drivers(): BelongsToMany
    {
        return $this->belongsToMany(Driver::class, 'driver_unit');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
