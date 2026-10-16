import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUp,
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Clock,
    Inbox,
    Loader2,
    MailCheck,
    Trash2,
    UserRound,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageButtons } from '@/components/pagination-bar';
import { Segmented } from '@/components/pims/segmented';
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
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PimsNotification } from '@/types/pims';

/* ─────────────────────────── Types ─────────────────────────── */
type FilterValue = 'all' | 'unread' | 'read' | 'action';
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
    action_count: number;
    filter: FilterValue;
}

/* ─────────────────── Time Helpers ──────────────────────────── */
function relativeTime(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

    if (diff < 60) {
        return 'Baru saja';
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)} mnt lalu`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)} jam lalu`;
    }

    if (diff < 604800) {
        return `${Math.floor(diff / 86400)} hari lalu`;
    }

    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function fullDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
    });
}

/* ─────────────────── Isi baris (Notifikasi-Desktop.png) ─────── */
type Group = 'Butuh tindakan' | 'Temuan' | 'Info';

const ACTION_TYPES = ['critical_alert', 'lv_approval_escalation', 'lv_approval_request'];

function groupOf(data: PimsNotification['data']): Group {
    const type = data.type ?? 'critical_alert';

    if (ACTION_TYPES.includes(type)) {
        return 'Butuh tindakan';
    }

    return type.startsWith('finding_') ? 'Temuan' : 'Info';
}

function describe(data: PimsNotification['data']): {
    kind: string;
    title: string;
    body: string;
    icon: typeof AlertTriangle;
    tone: 'danger' | 'warning' | 'neutral';
} {
    const unit = data.no_unit ?? '—';

    switch (data.type) {
        case 'lv_approval_escalation':
            return {
                kind: 'Eskalasi persetujuan',
                title: `P2H ${unit} belum disetujui`,
                body: `PIC ${data.pic_name ?? '—'} belum merespons sampai akhir shift · ${data.submitter ?? ''}`,
                icon: ArrowUp,
                tone: 'danger',
            };
        case 'lv_approval_request':
            return {
                kind: 'Permintaan persetujuan',
                title: `P2H ${unit} menunggu persetujuan`,
                body: [data.submitter, data.tanggal, data.shift].filter(Boolean).join(' · '),
                icon: Check,
                tone: 'neutral',
            };
        case 'lv_approval_result':
            return {
                kind: 'Hasil persetujuan',
                title: `P2H ${unit} ${data.status === 'approved' ? 'disetujui' : 'ditolak'}`,
                body: `oleh ${data.approver ?? '—'}${data.catatan ? ` — “${data.catatan}”` : ''}`,
                icon: data.status === 'approved' ? Check : XCircle,
                tone: data.status === 'approved' ? 'neutral' : 'danger',
            };
        case 'finding_assigned':
            return {
                kind: 'Temuan ditugaskan',
                title: `${data.item_nama ?? 'Temuan'} · ${unit}`,
                body: [
                    data.assigned_by && `ditugaskan oleh ${data.assigned_by}`,
                    data.target_selesai && `target ${data.target_selesai}`,
                ]
                    .filter(Boolean)
                    .join(' · '),
                icon: UserRound,
                tone: 'neutral',
            };
        case 'finding_overdue':
            return {
                kind: 'Temuan lewat tenggat',
                title: `${data.item_nama ?? 'Temuan'} · lewat ${data.hari_terlambat ?? 0} hari`,
                body: `${unit} · PIC ${data.pic_name ?? 'belum ditunjuk'}`,
                icon: Clock,
                tone: 'warning',
            };
        case 'p2h_missing':
            return {
                kind: 'Pengingat belum P2H',
                title: `${data.jumlah ?? 0} unit belum P2H`,
                body: unit,
                icon: Clock,
                tone: 'warning',
            };
        default:
            return {
                kind: 'Item kritis rusak',
                title: `${unit} · ${(data.critical_items ?? []).map((i) => i.nama_item).join(', ') || 'item kritis'}`,
                body: `P2H Tidak Layak oleh ${data.driver_name ?? '—'}. Unit otomatis BD.`,
                icon: AlertTriangle,
                tone: 'danger',
            };
    }
}

const TONE: Record<'danger' | 'warning' | 'neutral', string> = {
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    neutral: 'bg-muted text-foreground',
};

function NotificationRow({ notif }: { notif: PimsNotification }) {
    const isUnread = !notif.read_at;
    const d = describe(notif.data);
    const Icon = d.icon;
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!confirmDelete) {
            return;
        }

        const timer = setTimeout(() => setConfirmDelete(false), 3000);

        return () => clearTimeout(timer);
    }, [confirmDelete]);

    const open = () => router.patch(`/notifications/${notif.id}/read`);

    return (
        <li className="group relative border-t-(length:--bw) first:border-t-0">
            <button
                type="button"
                onClick={open}
                className="flex w-full gap-3 px-4 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50"
            >
                <span
                    className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-[10px]',
                        TONE[d.tone],
                    )}
                    aria-hidden
                >
                    <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {d.kind}
                        {isUnread && (
                            <span className="size-1.5 rounded-full bg-info">
                                <span className="sr-only">belum dibaca</span>
                            </span>
                        )}
                    </span>
                    <span
                        className={cn(
                            'mt-0.5 block text-[15px] leading-snug',
                            isUnread ? 'font-semibold' : 'font-medium',
                        )}
                    >
                        {d.title}
                    </span>
                    {d.body && (
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                            {d.body}
                        </span>
                    )}
                </span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <time className="shrink-0 text-xs text-muted-foreground tnum">
                            {relativeTime(notif.created_at)}
                        </time>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {fullDateTime(notif.created_at)}
                    </TooltipContent>
                </Tooltip>
            </button>

            {/* Aksi saat hover/fokus (docs/screens/manager-ops.md · Notifikasi) */}
            <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                {isUnread && (
                    <button
                        type="button"
                        onClick={() =>
                            router.patch(
                                `/notifications/${notif.id}/read`,
                                {},
                                { preserveScroll: true },
                            )
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <MailCheck className="size-3.5" />
                        Tandai dibaca
                    </button>
                )}
                <button
                    type="button"
                    onClick={() =>
                        confirmDelete
                            ? router.delete(`/notifications/${notif.id}`, {
                                  preserveScroll: true,
                              })
                            : setConfirmDelete(true)
                    }
                    className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs',
                        confirmDelete
                            ? 'bg-danger font-medium text-white'
                            : 'text-muted-foreground hover:bg-danger-soft hover:text-danger',
                    )}
                    aria-label={confirmDelete ? 'Konfirmasi hapus notifikasi' : 'Hapus notifikasi'}
                >
                    <Trash2 className="size-3.5" />
                    {confirmDelete ? 'Hapus?' : 'Hapus'}
                </button>
            </div>
        </li>
    );
}

/* ─────────────── Empty State ───────────────────────────────── */
function EmptyState({ tab }: { tab: string }) {
    const config = {
        all: {
            icon: Inbox,
            title: 'Belum ada notifikasi',
            desc: 'Notifikasi dari aktivitas P2H seperti critical alert dan permintaan persetujuan akan muncul di sini.',
        },
        unread: {
            icon: BellOff,
            title: 'Semua sudah dibaca',
            desc: 'Tidak ada notifikasi yang belum dibaca saat ini.',
        },
        read: {
            icon: Bell,
            title: 'Belum ada yang dibaca',
            desc: 'Notifikasi yang sudah dibaca akan tampil di sini.',
        },
    }[tab] ?? { icon: Inbox, title: 'Kosong', desc: '' };
    const Icon = config.icon;

    return (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="rounded-2xl bg-muted p-5">
                <Icon className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
                <p className="text-base font-semibold">{config.title}</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                    {config.desc}
                </p>
            </div>
        </div>
    );
}

/* ─────────── Pagination ─────────────────────────────────────── */
function Pagination({
    current_page,
    last_page,
    from,
    to,
    total,
    onPage,
}: {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    onPage: (p: number) => void;
}) {
    return (
        <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                    {from}–{to}
                </span>{' '}
                dari{' '}
                <span className="font-medium text-foreground">{total}</span>{' '}
                notifikasi
            </p>
            <PageButtons
                currentPage={current_page}
                lastPage={last_page}
                onPageChange={onPage}
            />
        </div>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function NotificationsIndex({
    notifications,
    unread_count,
    total_count,
    action_count,
    filter,
}: Props) {
    const [markingAll, setMarkingAll] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);

    const handleFilterChange = (value: FilterValue) => {
        router.get(
            '/notifications',
            { filter: value === 'all' ? undefined : value },
            { preserveState: false },
        );
    };

    const handleMarkAllRead = () => {
        if (markingAll) {
            return;
        }

        setMarkingAll(true);
        router.post(
            '/notifications/read-all',
            {},
            { onFinish: () => setMarkingAll(false) },
        );
    };

    const handleClearAll = () => {
        if (clearingAll) {
            return;
        }

        setClearingAll(true);
        router.delete('/notifications', {
            onFinish: () => {
                setClearingAll(false);
                setShowClearDialog(false);
            },
        });
    };

    const gotoPage = (page: number) => {
        router.get('/notifications', {
            filter: filter === 'all' ? undefined : filter,
            page,
        });
    };


    const grouped = notifications.data.reduce<
        Record<Group, PimsNotification[]>
    >(
        (acc, notif) => {
            acc[groupOf(notif.data)].push(notif);

            return acc;
        },
        { 'Butuh tindakan': [], Temuan: [], Info: [] },
    );

    const groupOrder: Group[] = ['Butuh tindakan', 'Temuan', 'Info'];

    return (
        <TooltipProvider>
            <Head title="Notifikasi" />
            <div className="w-full max-w-[820px] space-y-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                                Notifikasi
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {unread_count > 0
                                    ? `${unread_count} belum dibaca · ${action_count} butuh tindakan`
                                    : `${total_count} notifikasi · semua sudah dibaca`}
                            </p>
                        </div>
                    </div>

                    {total_count > 0 && (
                        <div className="flex items-center gap-2">
                            {unread_count > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleMarkAllRead}
                                    disabled={markingAll}
                                >
                                    {markingAll ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCheck className="h-3.5 w-3.5" />
                                    )}
                                    {markingAll
                                        ? 'Memproses…'
                                        : 'Tandai semua dibaca'}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowClearDialog(true)}
                                disabled={clearingAll}
                                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                {clearingAll ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                                {clearingAll ? 'Menghapus…' : 'Hapus semua'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Tab ── */}
                <Segmented
                    label="Filter notifikasi"
                    value={filter}
                    onChange={handleFilterChange}
                    options={[
                        { value: 'all', label: `Semua · ${total_count}` },
                        { value: 'unread', label: `Belum dibaca · ${unread_count}` },
                        { value: 'action', label: `Butuh tindakan · ${action_count}` },
                    ]}
                />

                {/* ── Content ── */}
                {notifications.data.length === 0 ? (
                    <EmptyState tab={filter} />
                ) : (
                    <div className="space-y-4">
                        <div className="overflow-hidden rounded-[14px] border-(length:--bw) bg-card">
                            {groupOrder
                                .filter((label) => grouped[label].length)
                                .map((label) => (
                                    <section key={label}>
                                        <h2 className="border-y-(length:--bw) bg-muted-2 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase first:border-t-0">
                                            {label}
                                        </h2>
                                        <ul>
                                            {grouped[label].map((notif) => (
                                                <NotificationRow
                                                    key={notif.id}
                                                    notif={notif}
                                                />
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                        </div>

                        {notifications.last_page > 1 ? (
                            <Pagination
                                current_page={notifications.current_page}
                                last_page={notifications.last_page}
                                from={notifications.from}
                                to={notifications.to}
                                total={notifications.total}
                                onPage={gotoPage}
                            />
                        ) : (
                            <p className="border-t pt-4 text-xs text-muted-foreground">
                                Total{' '}
                                <span className="font-medium text-foreground">
                                    {notifications.total}
                                </span>{' '}
                                notifikasi
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Clear all dialog ── */}
            <AlertDialog
                open={showClearDialog}
                onOpenChange={setShowClearDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Hapus semua notifikasi?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Sebanyak{' '}
                            <span className="font-semibold text-foreground">
                                {total_count} notifikasi
                            </span>{' '}
                            akan dihapus secara permanen. Tindakan ini tidak
                            dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearingAll}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClearAll}
                            disabled={clearingAll}
                            className="gap-2 bg-destructive text-white hover:bg-destructive/90"
                        >
                            {clearingAll && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
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
