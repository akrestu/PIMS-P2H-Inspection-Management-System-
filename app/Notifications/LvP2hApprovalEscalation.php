<?php

namespace App\Notifications;

use App\Models\P2hUserEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class LvP2hApprovalEscalation extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly P2hUserEntry $entry,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'lv_approval_escalation',
            'entry_id' => $this->entry->id,
            'session_id' => $this->entry->p2h_session_id,
            'no_unit' => $this->entry->session?->unit?->no_unit ?? '-',
            'submitter' => $this->entry->user?->name ?? '-',
            'pic_name' => $this->entry->pic?->name ?? '-',
            'shift' => $this->entry->shift,
            'tanggal' => $this->entry->session?->tanggal?->format('d/m/Y'),
            'submitted_at' => $this->entry->submitted_at?->toIso8601String(),
        ];
    }
}
