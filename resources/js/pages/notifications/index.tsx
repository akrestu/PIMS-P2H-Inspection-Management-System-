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

/* ─────────────────── Time Helpers ──────────────────────────── */
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

function getDateGroupLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

    if (date >= todayStart) return 'Hari ini';
    if (date >= yesterdayStart) return 'Kemarin';
    if (date >= weekStart) return 'Minggu ini';
    return 'Lebih lama';
}

/* ─────────── Notification type config ─────────────────────── */
type NotifType = 'critical_alert' | 'lv_approval_request' | 'lv_approval_result';

function getTypeConfig(data: PimsNotification['data']) {
    const type = (data.type ?? 'critical_alert') as NotifType;

    if (type === 'lv_approval_request') {
        return {
            icon: ClipboardCheck,
            iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
            borderClass: 'border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20',
            hoverClass: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
            badge: (
                <Badge variant="secondary" className="gap-1 border-amber-200 bg-amber-100 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <ClipboardCheck className="h-3 w-3" />
                    Permintaan Persetujuan
                </Badge>
            ),
            actionHint: 'Tinjau & setujui',
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
                ? 'border-l-green-400 bg-green-50/60 dark:bg-green-950/20'
                : 'border-l-red-400 bg-red-50/60 dark:bg-red-950/20',
            hoverClass: approved
                ? 'hover:bg-green-50 dark:hover:bg-green-950/30'
                : 'hover:bg-red-50 dark:hover:bg-red-950/30',
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
            actionHint: 'Lihat detail P2H',
        };
    }

    return {
        icon: TriangleAlert,
        iconClass: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
        borderClass: 'border-l-red-500 bg-red-50/60 dark:bg-red-950/20',
        hoverClass: 'hover:bg-red-50 dark:hover:bg-red-950/30',
        badge: (
            <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Critical Alert
            </Badge>
        ),
        actionHint: 'Lihat sesi P2H',
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
            className={`relative flex cursor-pointer gap-3 rounded-xl border border-l-4 p-4 transition-colors ${config.borderClass} ${config.hoverClass} ${!isUnread ? '!border-l-border !bg-card hover:!bg-muted/30' : ''}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
            {/* Icon */}
            <div className="shrink-0 pt-0.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isUnread ? config.iconClass : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1 space-y-1.5">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {config.badge}
                    {isUnread && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Belum dibaca
                        </span>
                    )}
                </div>

                {/* Unit + submitter row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-semibold">Unit {notif.data.no_unit}</span>
                    {notif.data.tanggal && (
                        <span className="text-muted-foreground">· {notif.data.tanggal}</span>
                    )}
                    {notif.data.shift && (
                        <span className="text-muted-foreground">· {notif.data.shift}</span>
                    )}
                    {(notif.data.driver_name || notif.data.submitter) && (
                        <span className="text-muted-foreground">
                            · {notif.data.driver_name
                                ? <>Driver: <span className="text-foreground font-medium">{notif.data.driver_name}</span></>
                                : <>Oleh: <span className="text-foreground font-medium">{notif.data.submitter}</span></>
                            }
                        </span>
                    )}
                </div>

                {/* Approval result details */}
                {notif.data.type === 'lv_approval_result' && notif.data.approver && (
                    <div className="text-sm text-muted-foreground">
                        Diproses oleh: <span className="text-foreground font-medium">{notif.data.approver}</span>
                        {notif.data.catatan && (
                            <span className="ml-1 italic">— "{notif.data.catatan}"</span>
                        )}
                    </div>
                )}

                {/* Critical items */}
                {(notif.data.critical_items?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {notif.data.critical_items!.map((item, idx) => (
                            <div
                                key={idx}
                                className="inline-flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 dark:border-red-900/50 dark:bg-red-950/30"
                            >
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                <span className="text-xs text-red-700 dark:text-red-400">
                                    <span className="font-medium">{item.nama_item}</span>
                                    {item.keterangan && <span className="text-red-500"> — {item.keterangan}</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: timestamp + action hint */}
                <div className="flex items-center justify-between pt-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <time className="text-muted-foreground cursor-default text-xs">
                                {relativeTime(notif.created_at)}
                            </time>
                        </TooltipTrigger>
                        <TooltipContent>{fullDateTime(notif.created_at)}</TooltipContent>
                    </Tooltip>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {isUnread ? config.actionHint : 'Lihat detail'}
                        <ExternalLink className="h-3 w-3" />
                    </span>
                </div>
            </div>

            {/* Unread dot + delete — always visible */}
            <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5">
                {isUnread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleDelete}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

/* ─────────────────── Date Group ────────────────────────────── */
function DateGroup({ label, notifications }: { label: string; notifications: PimsNotification[] }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                <div className="flex-1 border-t" />
            </div>
            {notifications.map((notif) => (
                <NotificationCard key={notif.id} notif={notif} />
            ))}
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
            <div className="rounded-full bg-muted p-5">
                <Icon className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
                <p className="text-base font-semibold">{config.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{config.desc}</p>
            </div>
        </div>
    );
}

/* ─────────────────── Filter Tab Button ─────────────────────── */
function FilterTab({
    active, label, count, accent, onClick,
}: {
    active: boolean; label: string; count?: number; accent?: 'red'; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${
                    accent === 'red'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                }`}>
                    {count}
                </span>
            )}
        </button>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function NotificationsIndex({ notifications, unread_count, total_count, filter }: Props) {
    const [markingAll, setMarkingAll] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);

    const handleFilterChange = (value: string) => {
        router.get('/notifications', { filter: value === 'all' ? undefined : value }, { preserveState: false });
    };

    const handleMarkAllRead = () => {
        if (markingAll) return;
        setMarkingAll(true);
        router.post('/notifications/read-all', {}, { onFinish: () => setMarkingAll(false) });
    };

    const handleClearAll = () => {
        if (clearingAll) return;
        setClearingAll(true);
        router.delete('/notifications', {
            onFinish: () => { setClearingAll(false); setShowClearDialog(false); },
        });
    };

    const gotoPage = (page: number) => {
        router.get('/notifications', { filter: filter === 'all' ? undefined : filter, page });
    };

    const readCount = total_count - unread_count;

    // Group notifications by date
    const grouped = notifications.data.reduce<Record<string, PimsNotification[]>>((acc, notif) => {
        const label = getDateGroupLabel(notif.created_at);
        if (!acc[label]) acc[label] = [];
        acc[label].push(notif);
        return acc;
    }, {});

    const groupOrder = ['Hari ini', 'Kemarin', 'Minggu ini', 'Lebih lama'];

    return (
        <TooltipProvider>
            <Head title="Notifikasi" />
            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Bell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Notifikasi</h1>
                                <p className="text-xs text-muted-foreground">
                                    {unread_count > 0
                                        ? `${unread_count} belum dibaca · ${total_count} total`
                                        : `${total_count} notifikasi · semua sudah dibaca`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {total_count > 0 && (
                        <div className="flex items-center gap-2">
                            {unread_count > 0 && (
                                <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAll} className="gap-1.5 text-xs">
                                    {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                                    {markingAll ? 'Memproses…' : 'Tandai Semua Dibaca'}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowClearDialog(true)}
                                disabled={clearingAll}
                                className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                {clearingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {clearingAll ? 'Menghapus…' : 'Hapus Semua'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                    <FilterTab
                        active={filter === 'all'}
                        label="Semua"
                        count={total_count}
                        onClick={() => handleFilterChange('all')}
                    />
                    <FilterTab
                        active={filter === 'unread'}
                        label="Belum Dibaca"
                        count={unread_count}
                        accent="red"
                        onClick={() => handleFilterChange('unread')}
                    />
                    <FilterTab
                        active={filter === 'read'}
                        label="Sudah Dibaca"
                        count={readCount}
                        onClick={() => handleFilterChange('read')}
                    />
                </div>

                {/* ── Content ── */}
                {notifications.data.length === 0 ? (
                    <EmptyState tab={filter} />
                ) : (
                    <div className="space-y-6">
                        {groupOrder
                            .filter((label) => grouped[label]?.length)
                            .map((label) => (
                                <DateGroup key={label} label={label} notifications={grouped[label]} />
                            ))}

                        {/* Pagination */}
                        {notifications.last_page > 1 && (
                            <div className="flex items-center justify-between border-t pt-4">
                                <p className="text-sm text-muted-foreground">
                                    {notifications.from}–{notifications.to} dari{' '}
                                    <span className="font-medium">{notifications.total}</span> notifikasi
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline" size="sm"
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
                                                    <span key={`e-${i}`} className="px-1 py-1 text-sm text-muted-foreground">…</span>
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
                                        variant="outline" size="sm"
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
                            <p className="border-t pt-4 text-sm text-muted-foreground">
                                Total <span className="font-medium">{notifications.total}</span> notifikasi
                            </p>
                        )}
                    </div>
                )}
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
