import { Link, router, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    AlertTriangle,
    Bell,
    BellOff,
    CheckCircle,
    ClipboardCheck,
    ClipboardX,
    Timer,
    Wrench,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface RecentNotification {
    id: string;
    data: {
        type?: string;
        no_unit?: string;
        driver_name?: string;
        submitter?: string;
        status?: string;
        jumlah?: number;
    };
    read_at: string | null;
    created_at: string;
}

interface NotificationsSharedProp {
    unread_count: number;
    recent?: RecentNotification[];
}

function notifIcon(type?: string, status?: string) {
    if (type === 'lv_approval_request') {
        return <ClipboardCheck className="h-4 w-4 text-warning" />;
    }

    if (type === 'lv_approval_escalation') {
        return <Timer className="h-4 w-4 text-warning" />;
    }

    if (type === 'lv_approval_result') {
        return status === 'approved' ? (
            <CheckCircle className="h-4 w-4 text-success" />
        ) : (
            <XCircle className="h-4 w-4 text-danger" />
        );
    }

    if (type === 'finding_assigned') {
        return <Wrench className="h-4 w-4 text-info" />;
    }

    if (type === 'p2h_missing') {
        return <ClipboardX className="h-4 w-4 text-warning" />;
    }

    if (type === 'finding_overdue') {
        return <AlarmClock className="h-4 w-4 text-danger" />;
    }

    return <AlertTriangle className="h-4 w-4 text-danger" />;
}

function notifLabel(data: RecentNotification['data']): string {
    const unit = data.no_unit ? `Unit ${data.no_unit}` : '';

    if (data.type === 'lv_approval_request') {
        return `Persetujuan LV — ${unit}`;
    }

    if (data.type === 'lv_approval_escalation') {
        return `Eskalasi persetujuan — ${unit}`;
    }

    if (data.type === 'lv_approval_result') {
        return data.status === 'approved'
            ? `Disetujui — ${unit}`
            : `Ditolak — ${unit}`;
    }

    if (data.type === 'finding_assigned') {
        return `Tugas perbaikan — ${unit}`;
    }

    if (data.type === 'finding_overdue') {
        return `Temuan lewat target — ${unit}`;
    }

    if (data.type === 'p2h_missing') {
        return `Belum P2H (${data.jumlah ?? 0} unit) — ${data.no_unit ?? ''}`;
    }

    return `Critical Alert — ${unit}`;
}

/**
 * Lonceng + panel notifikasi: popup di desktop, sheet bawah di mobile.
 * Membuka notifikasi menandainya dibaca lalu server mengarahkan ke halaman terkait.
 */
export default function NotificationBell({
    className,
    side = 'bottom',
}: {
    className?: string;
    side?: 'bottom' | 'right';
}) {
    const { notification_bell: notifications } = usePage<{
        notification_bell: NotificationsSharedProp;
    }>().props;
    const [open, setOpen] = useState(false);
    const isDesktop = useIsDesktop();
    const unreadCount = notifications?.unread_count ?? 0;
    const recent = notifications?.recent ?? [];
    const summary =
        unreadCount > 0 ? unreadCount + ' belum dibaca' : 'Semua sudah dibaca';

    const openItem = (id: string) => {
        setOpen(false);
        router.patch('/notifications/' + id + '/read');
    };

    const markAllRead = unreadCount > 0 && (
        <Button
            variant="ghost"
            size="sm"
            onClick={() =>
                router.post(
                    '/notifications/read-all',
                    {},
                    { preserveScroll: true },
                )
            }
        >
            Tandai dibaca
        </Button>
    );

    const body = (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-4">
            {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-muted">
                        <BellOff
                            className="size-5 text-muted-foreground"
                            aria-hidden
                        />
                    </span>
                    <p className="font-bold">Belum ada notifikasi</p>
                    <p className="text-sm text-muted-foreground">
                        Persetujuan dan pengingat akan muncul di sini.
                    </p>
                </div>
            ) : (
                <ul className="overflow-hidden rounded-md bg-muted-2">
                    {recent.map((notif) => (
                        <li key={notif.id} className="border-b last:border-b-0">
                            <button
                                type="button"
                                onClick={() => openItem(notif.id)}
                                className="flex min-h-14 w-full items-start gap-3 px-3.5 py-3 text-left hover:bg-muted"
                            >
                                <span className="mt-0.5 shrink-0">
                                    {notifIcon(
                                        notif.data.type,
                                        notif.data.status,
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={cn(
                                            'block text-sm leading-snug',
                                            !notif.read_at && 'font-semibold',
                                        )}
                                    >
                                        {notifLabel(notif.data)}
                                    </span>
                                    {(notif.data.driver_name ||
                                        notif.data.submitter) && (
                                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                            {notif.data.driver_name ??
                                                notif.data.submitter}
                                        </span>
                                    )}
                                </span>
                                {!notif.read_at && (
                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand">
                                        <span className="sr-only">
                                            Belum dibaca
                                        </span>
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <Button asChild variant="outline" className="w-full">
                <Link href="/notifications" onClick={() => setOpen(false)}>
                    Lihat semua notifikasi
                </Link>
            </Button>
        </div>
    );

    const trigger = (
        <button
            type="button"
            aria-label={
                unreadCount > 0
                    ? 'Notifikasi, ' + unreadCount + ' belum dibaca'
                    : 'Notifikasi'
            }
            onClick={isDesktop ? undefined : () => setOpen(true)}
            className={cn(
                'relative grid size-12 shrink-0 press place-items-center rounded-full hover:bg-muted lg:size-10',
                className,
            )}
        >
            <Bell className="size-5" strokeWidth={1.8} aria-hidden />
            {unreadCount > 0 && (
                <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground"
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );

    if (isDesktop) {
        return (
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
                <DropdownMenuContent
                    side={side}
                    align="end"
                    sideOffset={side === 'right' ? 16 : 8}
                    className="flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-2xl border-0 p-0 shadow-lg"
                >
                    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
                        <div>
                            <h2 className="text-lg font-extrabold tracking-[-0.02em]">
                                Notifikasi
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {summary}
                            </p>
                        </div>
                        {markAllRead}
                    </div>
                    {body}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <>
            {trigger}
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <DrawerHeader className="flex-row items-center justify-between gap-3">
                        <div>
                            <DrawerTitle className="text-left text-2xl font-extrabold">
                                Notifikasi
                            </DrawerTitle>
                            <DrawerDescription className="text-left">
                                {summary}
                            </DrawerDescription>
                        </div>
                        {markAllRead}
                    </DrawerHeader>
                    {body}
                </DrawerContent>
            </Drawer>
        </>
    );
}
