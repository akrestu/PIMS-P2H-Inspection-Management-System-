<?php

namespace App\Http\Controllers;

use App\Models\P2hAttachment;
use App\Models\P2hUserEntry;
use App\Models\User;
use App\Support\P2hFileStorage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class P2hFileController extends Controller
{
    public function signature(P2hUserEntry $entry, string $type): StreamedResponse
    {
        abort_unless($this->canViewEntry(request()->user(), $entry), 403);

        $path = match ($type) {
            'submitter' => $entry->paraf_url,
            'approver' => $entry->approver_signature_url,
            default => null,
        };

        abort_unless($path, 404);

        return P2hFileStorage::response($path);
    }

    public function attachment(P2hAttachment $attachment): StreamedResponse
    {
        $attachment->loadMissing('entry.session');
        abort_unless($this->canViewEntry(request()->user(), $attachment->entry), 403);

        return P2hFileStorage::response($attachment->path);
    }

    private function canViewEntry(User $user, P2hUserEntry $entry): bool
    {
        return $user->isPrivileged()
            || ($user->hasRole('driver')
                && ($entry->user_id === $user->id || $entry->pic_approver_id === $user->id));
    }
}
