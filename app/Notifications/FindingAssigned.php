<?php

namespace App\Notifications;

use App\Models\P2hFinding;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class FindingAssigned extends Notification
{
    use Queueable;

    public function __construct(
        protected P2hFinding $finding,
        protected string $assignedBy,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'finding_assigned',
            'finding_id' => $this->finding->id,
            'no_unit' => $this->finding->unit?->no_unit,
            'item_nama' => $this->finding->item_nama,
            'keterangan' => $this->finding->keterangan,
            'tindakan_perbaikan' => $this->finding->tindakan_perbaikan,
            'target_selesai' => $this->finding->target_selesai?->toDateString(),
            'assigned_by' => $this->assignedBy,
        ];
    }
}
