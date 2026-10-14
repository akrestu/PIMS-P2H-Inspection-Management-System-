<?php

namespace App\Support;

use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

/**
 * Status operasional unit (Ready / BD / PM / Servis Berkala), disimpan sebagai
 * periode di unit_downtime_logs: log yang masih berjalan = status unit saat ini.
 *
 * Admin mengatur status setiap unit. P2H menjadi pemicu perubahan bila admin
 * belum memperbarui: P2H BD → unit BD, P2H Layak Pakai → unit Ready.
 * Yang paling akhir terjadi yang berlaku — perubahan admin setelah P2H tidak ditimpa.
 */
class UnitStatus
{
    public const READY = 'Ready';

    public const DOWN_TYPES = ['BD', 'PM', 'Servis Berkala'];

    /** Perubahan status oleh admin. */
    public static function setByAdmin(Unit $unit, string $status, CarbonInterface $at, int $userId, ?string $keterangan = null): void
    {
        $ongoing = UnitDowntimeLog::where('unit_id', $unit->id)->whereNull('jam_selesai')->first();

        if ($ongoing && $at->lessThan($ongoing->jam_mulai)) {
            throw ValidationException::withMessages([
                'waktu' => "Waktu tidak boleh sebelum status {$ongoing->tipe} dimulai ({$ongoing->jam_mulai->format('d/m/Y H:i')}).",
            ]);
        }

        if ($ongoing?->tipe === $status) {
            return;
        }

        $ongoing?->update(['jam_selesai' => $at]);

        if ($status !== self::READY) {
            UnitDowntimeLog::create([
                'unit_id' => $unit->id,
                'tipe' => $status,
                'jam_mulai' => $at,
                'keterangan' => $keterangan,
                'created_by' => $userId,
            ]);
        }
    }

    /** P2H sah sebagai pemicu perubahan status. */
    public static function fromEntry(P2hUserEntry $entry): void
    {
        if (! $entry->isValid() || ! $entry->kondisi_akhir) {
            return;
        }

        $unitId = $entry->session?->unit_id;
        if (! $unitId) {
            return;
        }

        $at = $entry->submitted_at ?? $entry->created_at ?? now();
        $ongoing = UnitDowntimeLog::where('unit_id', $unitId)->whereNull('jam_selesai');

        if ($entry->kondisi_akhir === 'BD') {
            // Unit sudah tidak Ready (BD/PM/Servis dari admin) → status tetap
            if ($ongoing->exists()) {
                return;
            }

            UnitDowntimeLog::create([
                'unit_id' => $unitId,
                'tipe' => 'BD',
                'jam_mulai' => $at,
                'keterangan' => trim('Otomatis dari P2H '.($entry->shift ?? '').' '.$at->format('d/m/Y H:i')
                    .($entry->justifikasi_kondisi ? ' — '.$entry->justifikasi_kondisi : '')),
                'created_by' => $entry->user_id,
                'opened_by_entry_id' => $entry->id,
            ]);

            return;
        }

        // Layak Pakai → Ready. Hanya status yang dimulai sebelum P2H ini yang diakhiri,
        // sehingga perubahan admin setelah P2H tetap berlaku.
        $ongoing->where('jam_mulai', '<=', $at)
            ->get()
            ->each(fn (UnitDowntimeLog $log) => $log->update([
                'jam_selesai' => $at,
                'closed_by_entry_id' => $entry->id,
            ]));
    }

    /** Entry dihapus/ditolak: batalkan efek otomatisnya. */
    public static function revertEntry(P2hUserEntry $entry): void
    {
        UnitDowntimeLog::where('opened_by_entry_id', $entry->id)->delete();

        UnitDowntimeLog::where('closed_by_entry_id', $entry->id)
            ->update(['jam_selesai' => null, 'closed_by_entry_id' => null]);
    }
}
