import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, CheckCircle, ClipboardCheck, XCircle } from 'lucide-react';

interface RecentNotification {
    id: string;
    data: {
        type?: string;
        no_unit?: string;
        driver_name?: string;
        submitter?: string;
        status?: string;
    };
    read_at: string | null;
    created_at: string;
}

interface NotificationsSharedProp {
    unread_count: number;
    recent?: RecentNotification[];
}

function notifIcon(type?: string, status?: string) {
    if (type === 'lv_approval_request') return <ClipboardCheck className="h-4 w-4 text-amber-500" />;
    if (type === 'lv_approval_result') {
        return status === 'approved'
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
}

function notifLabel(data: RecentNotification['data']): string {
    const unit = data.no_unit ? `Unit ${data.no_unit}` : '';
    if (data.type === 'lv_approval_request') return `Persetujuan LV — ${unit}`;
    if (data.type === 'lv_approval_result') {
        return data.status === 'approved' ? `Disetujui — ${unit}` : `Ditolak — ${unit}`;
    }
    return `Critical Alert — ${unit}`;
}

export default function NotificationBell() {
    const { notifications } = usePage<{ notifications: NotificationsSharedProp }>().props;
    const unreadCount = notifications?.unread_count ?? 0;
    const recent = notifications?.recent ?? [];

    const handleNotifClick = (id: string) => {
        router.patch(`/notifications/${id}/read`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifikasi</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-semibold text-sm">Notifikasi</span>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900 dark:text-red-200">
                            {unreadCount} belum dibaca
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator />

                {recent.length > 0 ? (
                    <>
                        {recent.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                className="flex cursor-pointer items-start gap-2 px-3 py-2"
                                onClick={() => handleNotifClick(notif.id)}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {notifIcon(notif.data.type, notif.data.status)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-xs font-medium ${!notif.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {notifLabel(notif.data)}
                                    </p>
                                    {(notif.data.driver_name || notif.data.submitter) && (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {notif.data.driver_name ?? notif.data.submitter}
                                        </p>
                                    )}
                                </div>
                                {!notif.read_at && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Tidak ada notifikasi baru
                    </div>
                )}

                <DropdownMenuItem asChild>
                    <Link href="/notifications" className="w-full cursor-pointer text-xs text-muted-foreground justify-center">
                        Lihat semua notifikasi
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
