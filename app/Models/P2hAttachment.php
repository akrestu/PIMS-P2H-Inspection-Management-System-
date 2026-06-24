<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class P2hAttachment extends Model
{
    protected $fillable = ['p2h_user_entry_id', 'inspection_item_id', 'path'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(P2hUserEntry::class, 'p2h_user_entry_id');
    }
}
