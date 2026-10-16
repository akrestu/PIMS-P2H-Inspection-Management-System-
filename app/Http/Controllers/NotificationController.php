<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /** Jenis notifikasi yang meminta tindakan (Notifikasi.png · "Butuh tindakan"). */
    public const ACTION_TYPES = ['critical_alert', 'lv_approval_escalation', 'lv_approval_request', 'p2h_reminder'];

    public function index(Request $request): Response
    {
        $filter = $request->input('filter', 'all');

        $query = $request->user()->notifications()->latest();

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        } elseif ($filter === 'action') {
            $this->needsAction($query);
        }

        $notifications = $query->paginate(15)->withQueryString();

        $unreadCount = $request->user()->unreadNotifications()->count();
        $totalCount = $request->user()->notifications()->count();
        $actionCount = $this->needsAction($request->user()->unreadNotifications())->count();

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
            'total_count' => $totalCount,
            'action_count' => $actionCount,
            'filter' => $filter,
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

        // Approval request / eskalasi → arahkan ke halaman persetujuan P2H
        if (in_array($type, ['lv_approval_request', 'lv_approval_escalation'], true)) {
            return redirect()->route('p2h.approvals');
        }

        // Pengingat dari pengawas → langsung ke Form P2H
        if ($type === 'p2h_reminder') {
            return redirect()->route('p2h.create');
        }

        // Pengingat unit belum P2H → Monitoring Harian Unit, difilter unit yang kosong hari itu
        if ($type === 'p2h_missing') {
            $tanggal = $data['tanggal'] ?? today()->toDateString();

            return redirect()->route('unit-monitoring.index', ['start' => $tanggal, 'end' => $tanggal, 'status' => 'kosong']);
        }

        // Penugasan / pengingat temuan → halaman Temuan P2H (driver melihat temuan miliknya)
        if (in_array($type, ['finding_assigned', 'finding_overdue'], true)) {
            return redirect()->route('p2h.findings.index', [
                'status' => $type === 'finding_overdue' ? 'overdue' : 'unresolved',
                'search' => $data['no_unit'] ?? null,
            ]);
        }

        // Approval result → arahkan ke entry spesifik di detail sesi
        $sessionId = $data['session_id'] ?? null;
        if ($type === 'lv_approval_result' && $sessionId) {
            $entryId = $data['entry_id'] ?? null;

            return redirect()->route('p2h.show', array_filter([
                'session' => $sessionId,
                'entry' => $entryId,
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
            'type' => 'success',
            'message' => 'Semua notifikasi dibaca',
            'description' => 'Seluruh notifikasi telah ditandai sebagai sudah dibaca.',
        ]);

        return back();
    }

    public function destroy(Request $request, string $id): RedirectResponse
    {
        $user = $request->user();
        $user->notifications()->findOrFail($id)->delete();
        cache()->forget("recent_notifications_user_{$user->id}");

        return back();
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->notifications()->delete();
        cache()->forget("recent_notifications_user_{$user->id}");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Notifikasi dihapus',
            'description' => 'Seluruh notifikasi telah dihapus.',
        ]);

        return back();
    }

    /**
     * Filter notifikasi "butuh tindakan". Kolom data berupa teks JSON, jadi
     * dicocokkan per tipe dengan LIKE agar sama di SQLite, MySQL, dan PostgreSQL.
     */
    private function needsAction($query)
    {
        return $query->where(function ($q) {
            foreach (self::ACTION_TYPES as $type) {
                $q->orWhere('data', 'like', '%"type":"'.$type.'"%');
            }
        });
    }
}
