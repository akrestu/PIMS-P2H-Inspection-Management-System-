<?php

namespace App\Notifications;

use App\Models\Unit;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Pengingat dari pengawas ke driver yang ditugaskan: unit belum P2H hari ini. */
class P2hDriverReminder extends Notification
{
    use Queueable;

    public function __construct(protected Unit $unit, protected string $sender) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'p2h_reminder',
            'unit_id' => $this->unit->id,
            'no_unit' => $this->unit->no_unit,
            'sender' => $this->sender,
            'tanggal' => today()->toDateString(),
        ];
    }
}
