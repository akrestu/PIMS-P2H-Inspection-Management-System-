<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** Temuan yang menampung laporan ini (bisa gabungan dari beberapa laporan). */
    public function finding(): BelongsTo
    {
        return $this->belongsTo(P2hFinding::class, 'p2h_finding_id');
    }

    public function inspectionItem(): BelongsTo
    {
        return $this->belongsTo(P2hInspectionItem::class, 'inspection_item_id');
    }
}
