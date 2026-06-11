<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class P2hSession extends Model
{
    use SoftDeletes;
    protected $fillable = ['unit_id', 'tanggal', 'job_site', 'catatan_khusus', 'status', 'created_by'];

    protected $casts = [
        'tanggal' => 'date',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function userEntries(): HasMany
    {
        return $this->hasMany(P2hUserEntry::class)->orderBy('user_slot');
    }

    public function serviceInfo(): HasOne
    {
        return $this->hasOne(P2hServiceInfo::class);
    }
}
