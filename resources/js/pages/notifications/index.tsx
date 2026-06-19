import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ExternalLink,
    Inbox,
    Loader2,
    Trash2,
    TriangleAlert,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

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

/* ─────────── Notification type config ─────────────────────── */
type NotifType = 'critical_alert' | 'lv_approval_request' | 'lv_approval_result';

function getTypeConfig(data: PimsNotification['data']) {
    const type = (data.type ?? 'critical_alert') as NotifType;

    if (type === 'lv_approval_request') {
        return {
            icon: ClipboardCheck,
            iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
            borderClass: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
            badge: (
                <Badge variant="secondary" className="gap-1 border-amber-200 bg-amber-100 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <ClipboardCheck className="h-3 w-3" />
                    Permintaan Persetujuan
                </Badge>
            ),
            actionHint: 'Klik untuk tinjau & setujui',
        };
    }

    if (type === 'lv_approval_result') {
        const approved = data.status === 'approved';
        return {
            icon: approved ? CheckCircle : XCircle,
            iconClass: approved
                ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
            borderClass: approved
                ? 'border-green-200 bg-green-50/50 hover:bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 dark:hover:bg-green-950/30'
                : 'border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/30',
            badge: approved ? (
                <Badge variant="secondary" className="gap-1 border-green-200 bg-green-100 text-green-700 text-xs dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Disetujui
                </Badge>
            ) : (
                <Badge variant="destructive" className="gap-1 text-xs">
                    <XCircle className="h-3 w-3" />
                    Ditolak
                </Badge>
            ),
            actionHint: 'Klik untuk lihat detail P2H',
        };
    }

    // critical_alert (default)
    return {
        icon: TriangleAlert,
        iconClass: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
        borderClass: 'border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/30',
        badge: (
            <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Critical Alert
            </Badge>
        ),
        actionHint: 'Klik untuk lihat sesi P2H',
    };
}

/* ─────────────────── NotificationCard ─────────────────────── */
function NotificationCard({ notif }: { notif: PimsNotification }) {
    const isUnread = !notif.read_at;
    const config = getTypeConfig(notif.data);
    const Icon = config.icon;

    const handleClick = () => {
        router.patch(`/notifications/${notif.id}/read`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.delete(`/notifications/${notif.id}`, { preserveScroll: true });
    };

    return (
        <div
            className={`group relative flex cursor-pointer gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
                isUnread ? config.borderClass : 'border-border bg-card hover:bg-muted/30'
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
                        isUnread ? config.iconClass : 'bg-muted text-muted-foreground'
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1 space-y-2">
                {/* Top row: badges */}
                <div className="flex flex-wrap items-center gap-2">
                    {config.badge}
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

                {/* Unit info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">Unit {notif.data.no_unit}</span>
                    {(notif.data.driver_name || notif.data.submitter) && (
                        <>
                            <Separator orientation="vertical" className="h-3.5 hidden sm:block" />
                            <span className="text-muted-foreground text-sm">
                                {notif.data.driver_name
                                    ? <>Driver: <span className="text-foreground font-medium">{notif.data.driver_name}</span></>
                                    : <>Diajukan oleh: <span className="text-foreground font-medium">{notif.data.submitter}</span></>
                                }
                            </span>
                        </>
                    )}
                    {notif.data.shift && (
                        <>
                            <Separator orientation="vertical" className="h-3.5 hidden sm:block" />
                            <span className="text-muted-foreground text-sm">{notif.data.shift}</span>
                        </>
                    )}
                </div>

                {/* Approval result: approver & notes */}
                {notif.data.type === 'lv_approval_result' && (
                    <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Oleh: <span className="text-foreground font-medium">{notif.data.approver}</span></p>
                        {notif.data.catatan && (
                            <p className="italic">"{notif.data.catatan}"</p>
                        )}
                    </div>
                )}

                {/* Critical items */}
                {(notif.data.critical_items?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {notif.data.critical_items!.map((item, idx) => (
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
                        {isUnread ? config.actionHint : 'Lihat detail'}
                        <ExternalLink className="h-3 w-3" />
                    </span>
                </div>
            </div>

            {/* Unread dot + delete button */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {isUnread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleDelete}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            aria-label="Hapus notifikasi"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Hapus notifikasi ini</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

/* ─────────────── Empty State ───────────────────────────────── */
function EmptyState({ tab }: { tab: string }) {
    const config = {
        all: { icon: Inbox, title: 'Belum ada notifikasi', desc: 'Notifikasi dari aktivitas P2H (critical alert, persetujuan) akan muncul di sini.' },
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

    const [markingAll, setMarkingAll] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);

    const handleMarkAllRead = () => {
        if (markingAll) return;
        setMarkingAll(true);
        router.post('/notifications/read-all', {}, {
            onFinish: () => setMarkingAll(false),
        });
    };

    const handleClearAll = () => {
        if (clearingAll) return;
        setClearingAll(true);
        router.delete('/notifications', {
            onFinish: () => {
                setClearingAll(false);
                setShowClearDialog(false);
            },
        });
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

                    {total_count > 0 && (
                        <div className="flex items-center gap-2">
                            {unread_count > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAll} className="gap-2">
                                            {markingAll
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <CheckCheck className="h-4 w-4" />
                                            }
                                            {markingAll ? 'Memproses…' : 'Tandai Semua Dibaca'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Tandai {unread_count} notifikasi sebagai sudah dibaca</TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setShowClearDialog(true)} disabled={clearingAll} className="gap-2 text-destructive hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5">
                                        {clearingAll
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />
                                        }
                                        {clearingAll ? 'Menghapus…' : 'Hapus Semua'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus semua {total_count} notifikasi secara permanen</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* ── Tabs ── */}
                <Tabs value={filter} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="mb-2 w-full">
                        <TabsTrigger value="all" className="flex-1 gap-1.5">
                            <Bell className="h-3.5 w-3.5 shrink-0" />
                            <span>Semua</span>
                            {total_count > 0 && (
                                <span className="bg-muted-foreground/20 text-muted-foreground hidden rounded px-1.5 py-0.5 text-xs tabular-nums sm:inline">
                                    {total_count}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="flex-1 gap-1.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${unread_count > 0 ? 'bg-red-500' : 'bg-muted-foreground/40'}`} />
                            <span className="truncate">Belum Dibaca</span>
                            {unread_count > 0 && (
                                <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hidden rounded px-1.5 py-0.5 text-xs tabular-nums sm:inline">
                                    {unread_count}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="read" className="flex-1 gap-1.5">
                            <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Sudah Dibaca</span>
                            {readCount > 0 && (
                                <span className="bg-muted-foreground/20 text-muted-foreground hidden rounded px-1.5 py-0.5 text-xs tabular-nums sm:inline">
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

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus semua notifikasi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sebanyak <span className="font-semibold text-foreground">{total_count} notifikasi</span> akan dihapus secara permanen.
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearingAll}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClearAll}
                            disabled={clearingAll}
                            className="gap-2 bg-destructive text-white hover:bg-destructive/90"
                        >
                            {clearingAll && <Loader2 className="h-4 w-4 animate-spin" />}
                            {clearingAll ? 'Menghapus…' : 'Ya, Hapus Semua'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [{ title: 'Notifikasi', href: '/notifications' }],
};
