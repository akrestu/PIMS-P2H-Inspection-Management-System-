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

        // Driver hanya bisa lihat jika pernah mengisi salah satu entry
        return $session->userEntries()->where('user_id', $user->id)->exists();
    }
}
