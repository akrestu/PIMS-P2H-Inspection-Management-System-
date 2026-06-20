<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->input('filter', 'all');

        $query = $request->user()->notifications()->latest();

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->paginate(15)->withQueryString();

        $unreadCount = $request->user()->unreadNotifications()->count();
        $totalCount  = $request->user()->notifications()->count();

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
            'total_count'   => $totalCount,
            'filter'        => $filter,
        ]);
    }

    public function markRead(Request $request, string $id): RedirectResponse
    {
        $user = $request->user();
        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();
        cache()->forget("recent_notifications_user_{$user->id}");

        $data = $notification->data;
        $type = $data['type'] ?? 'critical_alert';

        // Approval request → arahkan ke halaman persetujuan P2H
        if ($type === 'lv_approval_request') {
            return redirect()->route('p2h.approvals');
        }

        // Approval result → arahkan ke entry spesifik di detail sesi
        $sessionId = $data['session_id'] ?? null;
        if ($type === 'lv_approval_result' && $sessionId) {
            $entryId = $data['entry_id'] ?? null;
            return redirect()->route('p2h.show', array_filter([
                'session' => $sessionId,
                'entry'   => $entryId,
            ], fn ($v) => $v !== null));
        }

        // Critical alert → arahkan ke detail sesi P2H
        if ($sessionId) {
            return redirect()->route('p2h.show', $sessionId);
        }

        return redirect()->route('notifications.index');
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->unreadNotifications()->update(['read_at' => now()]);
        cache()->forget("recent_notifications_user_{$user->id}");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Semua notifikasi dibaca',
            'description' => 'Seluruh notifikasi telah ditandai sebagai sudah dibaca.',
        ]);

        return back();
    }

    public function destroy(Request $request, string $id): RedirectResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();

        return back();
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        $request->user()->notifications()->delete();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Notifikasi dihapus',
            'description' => 'Seluruh notifikasi telah dihapus.',
        ]);

        return back();
    }
}
