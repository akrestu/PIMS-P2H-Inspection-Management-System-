<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Support\PendingApprovalCache;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        // Map session flash keys → shared flash.toast prop (fallback for redirect-based flashes)
        $flash = null;
        foreach (['success', 'error', 'warning', 'info'] as $type) {
            if ($request->session()->has($type)) {
                $flash = [
                    'type' => $type,
                    'message' => $request->session()->get($type),
                    'description' => $request->session()->get("{$type}_description"),
                ];
                break;
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'contact' => [
                'wa_number' => config('app.contact_wa', '085156650598'),
            ],
            'options' => [
                'shifts' => AppSetting::shifts(),
                'session_lifetime_minutes' => (int) config('session.lifetime', 120),
            ],
            'auth' => [
                'user' => $user ? array_merge($user->only(['id', 'name', 'email', 'jabatan', 'department', 'jenis_unit']), [
                    'roles' => $user->getRoleNames()->toArray(),
                    'can_approve' => $user->canApproveLv(),
                    'can_monitor' => $user->canViewMonitoring(),
                ]) : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'notifications' => [
                'unread_count' => $user ? $user->unreadNotifications()->count() : 0,
                'recent' => $user
                    ? cache()->remember(
                        "recent_notifications_user_{$user->id}",
                        now()->addSeconds(30),
                        fn () => $user->notifications()->latest()->limit(5)->get(['id', 'type', 'data', 'read_at', 'created_at'])
                    )
                    : [],
                'pending_approvals' => $user ? PendingApprovalCache::count($user) : 0,
            ],
            'flash' => $flash,
        ];
    }
}
