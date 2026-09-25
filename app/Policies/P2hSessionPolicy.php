<?php

namespace App\Policies;

use App\Models\P2hSession;
use App\Models\User;

class P2hSessionPolicy
{
    public function view(User $user, P2hSession $session): bool
    {
        if ($user->hasAnyRole(['admin', 'manager'])) {
            return true;
        }

        if (! $user->hasRole('driver')) {
            return false;
        }

        // Approval/User LV 2 boleh melihat P2H unit yang ada di matrix monitoring-nya
        if ($user->canMonitorUnit($session->unit)) {
            return true;
        }

        // Driver lain hanya bisa lihat jika pernah mengisi atau menjadi PIC approver salah satu entry
        // Kondisi OR wajib dikelompokkan agar tetap terikat ke sesi ini
        return $session->userEntries()
            ->where(fn ($q) => $q->where('user_id', $user->id)
                ->orWhere('pic_approver_id', $user->id))
            ->exists();
    }

    // Hanya admin yang boleh hapus sesi P2H (karena menyangkut audit trail)
    public function delete(User $user, P2hSession $session): bool
    {
        return $user->hasRole('admin');
    }

    // Hanya admin yang boleh hapus entry per shift
    public function deleteEntry(User $user, P2hSession $session): bool
    {
        return $user->hasRole('admin');
    }
}
