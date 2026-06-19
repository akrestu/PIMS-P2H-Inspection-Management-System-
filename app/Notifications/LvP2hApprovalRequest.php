<?php

namespace App\Notifications;

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class LvP2hApprovalRequest extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly P2hSession $session,
        public readonly P2hUserEntry $entry,
        public readonly User $submitter,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'lv_approval_request',
            'entry_id'     => $this->entry->id,
            'session_id'   => $this->session->id,
            'no_unit'      => $this->session->unit?->no_unit ?? '-',
            'submitter'    => $this->submitter->name,
            'shift'        => $this->entry->shift,
            'tanggal'      => $this->session->tanggal?->format('d/m/Y'),
            'submitted_at' => $this->entry->submitted_at?->toIso8601String(),
        ];
    }
}
