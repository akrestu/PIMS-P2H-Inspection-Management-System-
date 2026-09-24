<?php

namespace App\Policies;

use App\Models\P2hFinding;
use App\Models\User;

/**
 * Admin & manager mengelola semua temuan. Driver hanya bisa melihat dan
 * memperbarui progress temuan yang ditugaskan kepadanya (sebagai PIC).
 */
class P2hFindingPolicy
{
    public function manage(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'manager']);
    }

    public function view(User $user, P2hFinding $finding): bool
    {
        return $this->manage($user) || $finding->pic_user_id === $user->id;
    }

    public function update(User $user, P2hFinding $finding): bool
    {
        return $this->view($user, $finding);
    }
}
