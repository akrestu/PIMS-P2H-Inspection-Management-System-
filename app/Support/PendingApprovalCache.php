<?php

namespace App\Support;

use App\Models\P2hUserEntry;
use App\Models\User;

/**
 * Cache jumlah P2H LV pending per user (badge "Persetujuan P2H").
 *
 * Hanya PIC entry dan admin/manager yang menghitung entry tersebut,
 * jadi cukup cache milik mereka yang dibuang saat status entry berubah.
 */
class PendingApprovalCache
{
    private const TTL_SECONDS = 30;

    public static function key(int $userId): string
    {
        return "pending_approvals_user_{$userId}";
    }

    public static function count(User $user): int
    {
        if (! $user->canApproveLv()) {
            return 0;
        }

        return cache()->remember(
            self::key($user->id),
            now()->addSeconds(self::TTL_SECONDS),
            fn () => P2hUserEntry::where('approval_status', 'pending')
                ->whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'))
                ->when(! $user->isPrivileged(), fn ($q) => $q->where('pic_approver_id', $user->id))
                ->count()
        );
    }

    public static function forgetFor(P2hUserEntry $entry): void
    {
        User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'manager']))
            ->pluck('id')
            ->push($entry->pic_approver_id)
            ->filter()
            ->unique()
            ->each(fn (int $userId) => cache()->forget(self::key($userId)));
    }
}
