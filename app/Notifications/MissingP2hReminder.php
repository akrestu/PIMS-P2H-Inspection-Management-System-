<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Pengingat harian: unit aktif yang belum melakukan P2H hari ini. */
class MissingP2hReminder extends Notification
{
    use Queueable;

    private const MAX_LISTED = 15;

    /** @param  list<string>  $units */
    public function __construct(protected string $tanggal, protected array $units) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $listed = array_slice($this->units, 0, self::MAX_LISTED);
        $rest = count($this->units) - count($listed);

        return [
            'type' => 'p2h_missing',
            'tanggal' => $this->tanggal,
            'jumlah' => count($this->units),
            // Ditampilkan di kartu notifikasi sebagai "Unit ..."
            'no_unit' => implode(', ', $listed).($rest > 0 ? " +{$rest} lainnya" : ''),
        ];
    }
}
