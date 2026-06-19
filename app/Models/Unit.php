<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Unit extends Model
{
    use SoftDeletes;
    protected $fillable = ['no_unit', 'jenis_unit', 'no_lambung', 'status', 'department'];

    public function p2hSessions(): HasMany
    {
        return $this->hasMany(P2hSession::class);
    }

    public function downtimeLogs(): HasMany
    {
        return $this->hasMany(UnitDowntimeLog::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_unit');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
