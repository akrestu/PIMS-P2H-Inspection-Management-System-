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
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        $data = $notification->data;
        $sessionId = $data['session_id'] ?? null;

        if ($sessionId) {
            return redirect()->route('p2h.show', $sessionId);
        }

        return redirect()->route('notifications.index');
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Semua notifikasi dibaca',
            'description' => 'Seluruh notifikasi telah ditandai sebagai sudah dibaca.',
        ]);

        return back();
    }
}
