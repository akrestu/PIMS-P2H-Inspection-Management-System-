<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class P2hFuelLog extends Model
{
    protected $fillable = ['p2h_user_entry_id', 'km_unit', 'jumlah_liter'];

    protected $casts = [
        'jumlah_liter' => 'decimal:2',
    ];

    public function userEntry(): BelongsTo
    {
        return $this->belongsTo(P2hUserEntry::class, 'p2h_user_entry_id');
    }
}
