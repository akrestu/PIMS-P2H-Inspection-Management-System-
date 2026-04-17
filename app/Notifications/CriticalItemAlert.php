<?php

namespace App\Notifications;

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class CriticalItemAlert extends Notification
{
    use Queueable;

    public function __construct(
        protected P2hSession $session,
        protected P2hUserEntry $entry,
        protected Collection $criticalItems,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'session_id'     => $this->session->id,
            'no_unit'        => $this->session->unit->no_unit,
            'driver_name'    => $this->entry->user->name,
            'submitted_at'   => $this->entry->submitted_at?->toISOString(),
            'critical_items' => $this->criticalItems->map(fn ($answer) => [
                'nama_item'  => $answer->inspectionItem->nama_item,
                'keterangan' => $answer->keterangan,
            ])->toArray(),
        ];
    }
}
