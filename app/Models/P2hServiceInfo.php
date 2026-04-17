<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class P2hServiceInfo extends Model
{
    protected $table = 'p2h_service_info';

    protected $fillable = [
        'p2h_session_id', 'servis_mingguan', 'servis_berkala',
        'unschedule_breakdown', 'lainnya', 'catatan_servis',
    ];

    protected $casts = [
        'servis_mingguan'      => 'boolean',
        'servis_berkala'       => 'boolean',
        'unschedule_breakdown' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(P2hSession::class, 'p2h_session_id');
    }
}
