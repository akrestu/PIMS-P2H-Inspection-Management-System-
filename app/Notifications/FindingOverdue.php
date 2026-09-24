<?php

namespace App\Notifications;

use App\Models\P2hFinding;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class FindingOverdue extends Notification
{
    use Queueable;

    public function __construct(protected P2hFinding $finding) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'finding_overdue',
            'finding_id' => $this->finding->id,
            'no_unit' => $this->finding->unit?->no_unit,
            'item_nama' => $this->finding->item_nama,
            'pic_name' => $this->finding->pic?->name,
            'target_selesai' => $this->finding->target_selesai?->toDateString(),
            'hari_terlambat' => (int) $this->finding->target_selesai?->diffInDays(today()),
        ];
    }
}
