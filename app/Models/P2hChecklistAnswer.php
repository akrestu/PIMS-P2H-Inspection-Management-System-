<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class P2hChecklistAnswer extends Model
{
    protected $fillable = [
        'p2h_user_entry_id', 'inspection_item_id', 'kondisi', 'keterangan',
        'item_nama', 'item_section', 'item_kode_bahaya', 'item_urutan',
    ];

    /**
     * Setiap jawaban "Tidak Layak" otomatis tercatat sebagai temuan, dari
     * jalur mana pun jawaban itu dibuat.
     */
    protected static function booted(): void
    {
        static::created(function (self $answer) {
            if ($answer->kondisi !== 'Tidak Layak') {
                return;
            }

            $entry = $answer->userEntry()->with('session.unit')->first();

            if ($entry?->session?->unit) {
                P2hFinding::recordFromAnswer($answer, $entry, $entry->session->unit, $entry->session->tanggal);
            }
        });
    }

    public function userEntry(): BelongsTo
    {
        return $this->belongsTo(P2hUserEntry::class, 'p2h_user_entry_id');
    }

    public function finding(): HasOne
    {
        return $this->hasOne(P2hFinding::class);
    }

    public function inspectionItem(): BelongsTo
    {
        return $this->belongsTo(P2hInspectionItem::class, 'inspection_item_id');
    }
}
