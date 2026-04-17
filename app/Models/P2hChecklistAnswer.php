<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class P2hChecklistAnswer extends Model
{
    protected $fillable = ['p2h_user_entry_id', 'inspection_item_id', 'kondisi', 'keterangan'];

    public function userEntry(): BelongsTo
    {
        return $this->belongsTo(P2hUserEntry::class, 'p2h_user_entry_id');
    }

    public function inspectionItem(): BelongsTo
    {
        return $this->belongsTo(P2hInspectionItem::class, 'inspection_item_id');
    }
}
