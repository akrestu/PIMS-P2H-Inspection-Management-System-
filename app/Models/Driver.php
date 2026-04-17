<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Driver extends Model
{
    protected $fillable = ['user_id', 'nik', 'nama', 'department', 'jenis_unit'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
