import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PimsNotification } from '@/types/pims';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    BellOff,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Inbox,
    TriangleAlert,
} from 'lucide-react';

/* ─────────────────────────── Types ─────────────────────────── */
interface PaginatedData {
    data: PimsNotification[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
interface Props {
    notifications: PaginatedData;
    unread_count: number;
    total_count: number;
    filter: 'all' | 'unread' | 'read';
}

/* ─────────────────── Relative Time Helper ──────────────────── */
function relativeTime(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fullDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Asia/Jakarta',
    });
}

/* ─────────────────── NotificationCard ─────────────────────── */
function NotificationCard({ notif }: { notif: PimsNotification }) {
    const isUnread = !notif.read_at;

    const handleClick = () => {
        router.patch(`/notifications/${notif.id}/read`);
    };

    return (
        <div
            className={`group relative flex cursor-pointer gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
                isUnread
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                    : 'border-border bg-card hover:bg-muted/30'
            }`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
            {/* Left: Icon indicator */}
            <div className="shrink-0 pt-0.5">
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isUnread
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                    }`}
                >
                    <TriangleAlert className="h-5 w-5" />
                </div>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1 space-y-2">
                {/* Top row: badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="destructive"
                        className="gap-1 text-xs"
                    >
                        <AlertTriangle className="h-3 w-3" />
                        Critical Alert
                    </Badge>
                    {isUnread && (
                        <Badge
                            variant="secondary"
                            className="border-blue-200 bg-blue-100 text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Belum dibaca
                        </Badge>
                    )}
                </div>

                {/* Unit & Driver */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">
                        Unit {notif.data.no_unit}
                    </span>
                    <Separator orientation="vertical" className="h-3.5 hidden sm:block" />
                    <span className="text-muted-foreground text-sm">
                        Driver: <span className="text-foreground font-medium">{notif.data.driver_name}</span>
                    </span>
                </div>

                {/* Critical items */}
                {notif.data.critical_items?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {notif.data.critical_items.map((item, idx) => (
                            <div
                                key={idx}
                                className="inline-flex max-w-full items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 dark:border-red-900/50 dark:bg-red-950/30"
                            >
                                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                <span className="text-xs text-red-700 dark:text-red-400">
                                    <span className="font-medium">{item.nama_item}</span>
                                    {item.keterangan && (
                                        <span className="text-red-500 dark:text-red-500/80"> — {item.keterangan}</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: time + action hint */}
                <div className="flex items-center justify-between pt-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <time className="text-muted-foreground cursor-default text-xs">
                                {relativeTime(notif.created_at)}
                            </time>
                        </TooltipTrigger>
                        <TooltipContent>{fullDateTime(notif.created_at)}</TooltipContent>
                    </Tooltip>

                    <span className="text-muted-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                        {isUnread ? 'Klik untuk lihat & tandai dibaca' : 'Lihat sesi P2H'}
                        <ExternalLink className="h-3 w-3" />
                    </span>
                </div>
            </div>

            {/* Unread dot */}
            {isUnread && (
                <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
        </div>
    );
}

/* ─────────────── Empty State ───────────────────────────────── */
function EmptyState({ tab }: { tab: string }) {
    const config = {
        all: { icon: Inbox, title: 'Belum ada notifikasi', desc: 'Notifikasi critical alert dari sesi P2H akan muncul di sini.' },
        unread: { icon: BellOff, title: 'Semua sudah dibaca', desc: 'Tidak ada notifikasi yang belum dibaca saat ini.' },
        read: { icon: Bell, title: 'Belum ada yang dibaca', desc: 'Notifikasi yang sudah kamu baca akan tampil di sini.' },
    }[tab] ?? { icon: Inbox, title: 'Kosong', desc: '' };

    const Icon = config.icon;

    return (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="bg-muted rounded-full p-5">
                <Icon className="text-muted-foreground h-10 w-10" />
            </div>
            <div>
                <p className="text-base font-semibold">{config.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{config.desc}</p>
            </div>
        </div>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function NotificationsIndex({ notifications, unread_count, total_count, filter }: Props) {

    const handleTabChange = (value: string) => {
        router.get('/notifications', { filter: value === 'all' ? undefined : value }, { preserveState: false });
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/read-all');
    };

    const gotoPage = (page: number) => {
        router.get('/notifications', { filter: filter === 'all' ? undefined : filter, page });
    };

    const readCount = total_count - unread_count;

    return (
        <TooltipProvider>
            <Head title="Notifikasi" />
            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
                            {unread_count > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="h-6 min-w-6 justify-center rounded-full px-2 text-xs tabular-nums"
                                >
                                    {unread_count > 99 ? '99+' : unread_count}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            {unread_count > 0
                                ? `${unread_count} notifikasi belum dibaca dari total ${total_count}`
                                : `${total_count} total notifikasi, semua sudah dibaca`}
                        </p>
                    </div>

                    {unread_count > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
                                    <CheckCheck className="h-4 w-4" />
                                    Tandai Semua Dibaca
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tandai {unread_count} notifikasi sebagai sudah dibaca</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* ── Tabs ── */}
                <Tabs value={filter} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="mb-2">
                        <TabsTrigger value="all" className="gap-2">
                            <Bell className="h-3.5 w-3.5" />
                            Semua
                            {total_count > 0 && (
                                <span className="bg-muted-foreground/20 text-muted-foreground ml-0.5 rounded px-1.5 py-0.5 text-xs tabular-nums">
                                    {total_count}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="gap-2">
                            <span className={`h-2 w-2 rounded-full ${unread_count > 0 ? 'bg-red-500' : 'bg-muted-foreground/40'}`} />
                            Belum Dibaca
                            {unread_count > 0 && (
                                <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 ml-0.5 rounded px-1.5 py-0.5 text-xs tabular-nums">
                                    {unread_count}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="read" className="gap-2">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Sudah Dibaca
                            {readCount > 0 && (
                                <span className="bg-muted-foreground/20 text-muted-foreground ml-0.5 rounded px-1.5 py-0.5 text-xs tabular-nums">
                                    {readCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* All three tabs share the same rendered list (server-side filtered) */}
                    {(['all', 'unread', 'read'] as const).map((tab) => (
                        <TabsContent key={tab} value={tab} className="mt-0 focus-visible:outline-none">
                            {tab === filter && (
                                <div className="space-y-2">
                                    {notifications.data.length === 0 ? (
                                        <Card>
                                            <CardContent className="p-0">
                                                <EmptyState tab={tab} />
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <>
                                            {/* Notification list */}
                                            <div className="space-y-2">
                                                {notifications.data.map((notif) => (
                                                    <NotificationCard key={notif.id} notif={notif} />
                                                ))}
                                            </div>

                                            {/* Pagination */}
                                            {notifications.last_page > 1 && (
                                                <div className="flex items-center justify-between border-t pt-4">
                                                    <p className="text-muted-foreground text-sm">
                                                        Menampilkan{' '}
                                                        <span className="font-medium">{notifications.from}</span>–
                                                        <span className="font-medium">{notifications.to}</span>{' '}
                                                        dari{' '}
                                                        <span className="font-medium">{notifications.total}</span> notifikasi
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={notifications.current_page === 1}
                                                            onClick={() => gotoPage(notifications.current_page - 1)}
                                                            className="h-8 gap-1"
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                            Prev
                                                        </Button>
                                                        <div className="flex gap-1">
                                                            {Array.from({ length: notifications.last_page }, (_, i) => i + 1)
                                                                .filter((p) => p === 1 || p === notifications.last_page || Math.abs(p - notifications.current_page) <= 1)
                                                                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                                                    if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('...');
                                                                    acc.push(p);
                                                                    return acc;
                                                                }, [])
                                                                .map((p, i) =>
                                                                    p === '...' ? (
                                                                        <span key={`e-${i}`} className="text-muted-foreground px-1 py-1 text-sm">…</span>
                                                                    ) : (
                                                                        <Button
                                                                            key={p}
                                                                            size="sm"
                                                                            variant={p === notifications.current_page ? 'default' : 'outline'}
                                                                            onClick={() => gotoPage(p as number)}
                                                                            className="h-8 w-8 p-0"
                                                                        >
                                                                            {p}
                                                                        </Button>
                                                                    ),
                                                                )}
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={notifications.current_page === notifications.last_page}
                                                            onClick={() => gotoPage(notifications.current_page + 1)}
                                                            className="h-8 gap-1"
                                                        >
                                                            Next
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {notifications.last_page === 1 && (
                                                <p className="text-muted-foreground border-t pt-4 text-sm">
                                                    Total <span className="font-medium">{notifications.total}</span> notifikasi
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </TooltipProvider>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [{ title: 'Notifikasi', href: '/notifications' }],
};
