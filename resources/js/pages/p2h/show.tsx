import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Bus,
    CalendarDays,
    Car,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Fuel,
    Moon,
    PenLine,
    ShieldAlert,
    ShieldCheck,
    Sun,
    Trash2,
    User,
    Wrench,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import RiskBadge from '@/components/P2h/RiskBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { P2hInspectionItem, P2hSession, P2hUserEntry } from '@/types/pims';

interface Props {
    session: P2hSession;
    inspectionItems: P2hInspectionItem[];
}

const SECTION_ORDER: P2hInspectionItem['section'][] = ['A', 'B', 'C'];

const sectionGroupConfig = {
    A: {
        label: 'A — Pemeriksaan Keliling Unit / Di Luar Kabin',
        headerClass: 'bg-info-soft border-info/40 text-info   ',
        dot: 'bg-info',
    },
    B: {
        label: 'B — Pemeriksaan Dari Dalam Kabin',
        headerClass: 'bg-info-soft border-info/40 text-info   ',
        dot: 'bg-info',
    },
    C: {
        label: 'C — Kelengkapan Tambahan',
        headerClass: 'bg-muted/30 border-border text-foreground',
        dot: 'bg-muted-foreground/50',
    },
};

// ── Shift icon + color ────────────────────────────────────────────────────────
function ShiftBadge({ shift }: { shift?: string | null }) {
    if (!shift) {
        return <span className="text-muted-foreground">-</span>;
    }

    const map: Record<string, { icon: React.ReactNode; cls: string }> = {
        'Shift I': {
            icon: <Sun className="h-3.5 w-3.5" />,
            cls: 'bg-warning-soft text-warning border-warning/40  ',
        },
        'Shift II': {
            icon: <Moon className="h-3.5 w-3.5" />,
            cls: 'bg-info-soft text-info border-info/40  ',
        },
    };
    const cfg = map[shift] ?? { icon: null, cls: '' };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                cfg.cls,
            )}
        >
            {cfg.icon}
            {shift}
        </span>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    sub,
    variant = 'default',
}: {
    label: string;
    value: string | number;
    sub?: string;
    variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
    const cls = {
        default: 'bg-card border-border',
        success: 'bg-success-soft border-success/40  ',
        danger: 'bg-danger-soft border-danger/40  ',
        warning: 'bg-warning-soft border-warning/40  ',
    }[variant];
    const valueCls = {
        default: 'text-foreground',
        success: 'text-success ',
        danger: 'text-danger ',
        warning: 'text-warning ',
    }[variant];

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center',
                cls,
            )}
        >
            <span className={cn('text-2xl font-extrabold', valueCls)}>
                {value}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
                {label}
            </span>
            {sub && (
                <span className="mt-0.5 text-xs text-muted-foreground/70">
                    {sub}
                </span>
            )}
        </div>
    );
}

// ── Entry tab content ─────────────────────────────────────────────────────────
function EntryDetail({
    entry,
    inspectionItems,
}: {
    entry: P2hUserEntry;
    inspectionItems: P2hInspectionItem[];
}) {
    const hasTL =
        entry.answers?.some((a) => a.kondisi === 'Tidak Layak') ?? false;
    const tlItems =
        entry.answers?.filter((a) => a.kondisi === 'Tidak Layak') ?? [];
    const layakCount =
        entry.answers?.filter((a) => a.kondisi === 'Layak').length ?? 0;

    const groupedItems = SECTION_ORDER.reduce<
        Record<P2hInspectionItem['section'], P2hInspectionItem[]>
    >(
        (acc, s) => {
            acc[s] = inspectionItems.filter((i) => i.section === s);

            return acc;
        },
        { A: [], B: [], C: [] },
    );

    return (
        <div className="space-y-4 pt-2">
            {/* ── Summary stats ── */}
            <div className="grid grid-cols-3 gap-2">
                <StatCard label="Total Item" value={inspectionItems.length} />
                <StatCard label="Layak" value={layakCount} variant="success" />
                <StatCard
                    label="Tidak Layak"
                    value={tlItems.length}
                    variant={tlItems.length > 0 ? 'danger' : 'default'}
                />
            </div>

            {/* ── Approval status banner ── */}
            {entry.approval_status === 'pending' && (
                <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3">
                    <span className="text-warning">⏳</span>
                    <div>
                        <p className="text-sm font-semibold text-warning">
                            Menunggu Verifikasi
                        </p>
                        <p className="text-xs text-warning">
                            {entry.pic ? (
                                <>
                                    Menunggu persetujuan{' '}
                                    <span className="font-semibold">
                                        {entry.pic.name}
                                    </span>{' '}
                                    ({entry.pic.jabatan})
                                </>
                            ) : (
                                'P2H ini sedang menunggu persetujuan PIC yang ditunjuk.'
                            )}
                        </p>
                    </div>
                </div>
            )}
            {entry.approval_status === 'rejected' && (
                <div className="space-y-1 rounded-xl border border-danger/40 bg-danger-soft p-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
                        <XCircle className="h-4 w-4" />
                        P2H Ditolak
                    </p>
                    {entry.catatan_approval && (
                        <p className="text-xs text-danger">
                            <span className="font-semibold">Catatan: </span>
                            {entry.catatan_approval}
                        </p>
                    )}
                    {entry.approver && (
                        <p className="text-xs text-danger">
                            Ditolak oleh {entry.approver.name} ·{' '}
                            {entry.approved_at
                                ? new Date(entry.approved_at).toLocaleString(
                                      'id-ID',
                                      {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: false,
                                      },
                                  )
                                : ''}
                        </p>
                    )}
                </div>
            )}
            {entry.approval_status === 'approved' && (
                <div className="space-y-1 rounded-xl border border-success/40 bg-success-soft p-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <p className="text-sm font-semibold text-success">
                            Disetujui
                            {entry.approver
                                ? ` oleh ${entry.approver.name}`
                                : ''}
                            {entry.approved_at && (
                                <span className="ml-1.5 text-xs font-normal text-success">
                                    ·{' '}
                                    {new Date(entry.approved_at).toLocaleString(
                                        'id-ID',
                                        {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false,
                                        },
                                    )}
                                </span>
                            )}
                        </p>
                    </div>
                    {entry.catatan_approval && (
                        <p className="text-xs text-success">
                            <span className="font-semibold">Catatan: </span>
                            {entry.catatan_approval}
                        </p>
                    )}
                </div>
            )}

            {/* ── Driver info ── */}
            <Card>
                <CardHeader className="pt-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Informasi Pengemudi
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pb-4 text-sm sm:grid-cols-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Nama</p>
                        <p className="font-semibold">
                            {entry.user?.name ?? '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            NIK / NRPP
                        </p>
                        <p className="font-medium">{entry.user?.nik ?? '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Departemen
                        </p>
                        <p className="font-medium">
                            {entry.user?.department ?? '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Shift</p>
                        <ShiftBadge shift={entry.shift} />
                    </div>
                    {entry.lokasi_kerja && (
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Lokasi Kerja
                            </p>
                            <p className="font-medium">{entry.lokasi_kerja}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-muted-foreground">
                            HM/KM Awal
                        </p>
                        <p className="font-semibold">
                            {entry.km_awal
                                ? entry.km_awal.toLocaleString('id-ID')
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            HM/KM Akhir
                        </p>
                        <p className="font-semibold">
                            {entry.hm_km_akhir
                                ? entry.hm_km_akhir.toLocaleString('id-ID')
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Hasil Checklist
                        </p>
                        {hasTL ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Ada Item TL
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Semua Layak
                            </span>
                        )}
                    </div>
                    {entry.kondisi_akhir && (
                        <div className="col-span-2 sm:col-span-3">
                            <p className="mb-1 text-xs text-muted-foreground">
                                Keputusan Akhir Operator
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {entry.kondisi_akhir === 'Layak Pakai' ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Layak Pakai
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-bold text-danger">
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        BD / Tidak Layak
                                    </span>
                                )}
                                {entry.is_override && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                                        Override
                                    </span>
                                )}
                            </div>
                            {entry.justifikasi_kondisi && (
                                <p className="mt-1.5 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                                    <span className="font-semibold">
                                        Alasan:{' '}
                                    </span>
                                    {entry.justifikasi_kondisi}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── TL Items highlight ── */}
            {tlItems.length > 0 && (
                <div className="rounded-xl border-2 border-danger/40 bg-danger-soft p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-danger" />
                        <p className="text-sm font-bold text-danger">
                            {tlItems.length} Item Tidak Layak
                        </p>
                    </div>
                    <div className="space-y-2">
                        {tlItems.map((ans) => {
                            const item = inspectionItems.find(
                                (i) => i.id === ans.inspection_item_id,
                            );

                            return (
                                <div
                                    key={ans.id}
                                    className="rounded-lg bg-white/70 p-2.5"
                                >
                                    <div className="flex items-start gap-2">
                                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                                        <div>
                                            <p className="text-xs font-semibold text-danger">
                                                {item?.nama_item ??
                                                    `Item #${ans.inspection_item_id}`}
                                            </p>
                                            {ans.keterangan && (
                                                <p className="mt-0.5 text-xs text-danger">
                                                    {ans.keterangan}
                                                </p>
                                            )}
                                        </div>
                                        {item && (
                                            <RiskBadge
                                                kode_bahaya={item.kode_bahaya}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Checklist grouped by risk ── */}
            <Card>
                <CardHeader className="pt-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        Hasil Checklist Pemeriksaan
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                    {SECTION_ORDER.map((section) => {
                        const items = groupedItems[section];

                        if (items.length === 0) {
                            return null;
                        }

                        const cfg = sectionGroupConfig[section];

                        return (
                            <div
                                key={section}
                                className="overflow-hidden rounded-lg border"
                            >
                                <div
                                    className={cn(
                                        'flex items-center gap-2 border-b px-3 py-2',
                                        cfg.headerClass,
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'h-2 w-2 shrink-0 rounded-full',
                                            cfg.dot,
                                        )}
                                    />
                                    <span className="text-xs font-bold">
                                        Seksi {cfg.label}
                                    </span>
                                    <span className="ml-auto text-xs opacity-70">
                                        {items.length} item
                                    </span>
                                </div>
                                <div className="divide-y">
                                    {items.map((item) => {
                                        const ans = entry.answers?.find(
                                            (a) =>
                                                a.inspection_item_id ===
                                                item.id,
                                        );
                                        const isTL =
                                            ans?.kondisi === 'Tidak Layak';
                                        const isLayak =
                                            ans?.kondisi === 'Layak';

                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    'flex items-start gap-3 px-3 py-2.5 text-sm',
                                                    isTL && 'bg-danger-soft',
                                                )}
                                            >
                                                <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
                                                    {item.urutan}.
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm leading-snug">
                                                        {item.nama_item}
                                                    </p>
                                                    {isTL &&
                                                        ans?.keterangan && (
                                                            <p className="mt-0.5 text-xs text-danger">
                                                                ↳{' '}
                                                                {ans.keterangan}
                                                            </p>
                                                        )}
                                                </div>
                                                <div className="shrink-0">
                                                    {isTL ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                                                            <XCircle className="h-3 w-3" />
                                                            TL
                                                        </span>
                                                    ) : isLayak ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            OK
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            -
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ── Fuel log ── */}
            {entry.fuel_log &&
                (entry.fuel_log.km_unit || entry.fuel_log.jumlah_liter) && (
                    <Card>
                        <CardHeader className="pt-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                Pengisian Bahan Bakar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 pb-4 text-sm">
                            <div className="rounded-lg bg-muted/40 p-3 text-center">
                                <p className="text-2xl font-semibold">
                                    {entry.fuel_log.km_unit
                                        ? entry.fuel_log.km_unit.toLocaleString(
                                              'id-ID',
                                          )
                                        : '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    KM Saat Pengisian
                                </p>
                            </div>
                            <div className="rounded-lg bg-muted/40 p-3 text-center">
                                <p className="text-2xl font-semibold">
                                    {entry.fuel_log.jumlah_liter ?? '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Jumlah Liter
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* ── Tanda Tangan ── */}
            {(entry.paraf_url || entry.approver_signature_url) && (
                <Card>
                    <CardHeader className="pt-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <PenLine className="h-4 w-4 text-muted-foreground" />
                            Tanda Tangan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                        {entry.paraf_url && (
                            <div>
                                <p className="mb-1.5 text-xs text-muted-foreground">
                                    Pengemudi
                                </p>
                                <div className="flex h-28 w-48 items-center justify-center rounded-xl border-2 border-dashed border-muted bg-white p-2 dark:bg-gray-100">
                                    <img
                                        src={entry.paraf_url}
                                        alt={`Tanda tangan ${entry.user?.name}`}
                                        className="max-h-full max-w-full rounded-lg object-contain"
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    {entry.user?.name} ·{' '}
                                    {entry.submitted_at
                                        ? new Date(
                                              entry.submitted_at,
                                          ).toLocaleString('id-ID', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: false,
                                              timeZone: 'Asia/Jakarta',
                                          })
                                        : '-'}
                                </p>
                            </div>
                        )}
                        {entry.approver_signature_url && (
                            <div>
                                <p className="mb-1.5 text-xs text-muted-foreground">
                                    Approver
                                </p>
                                <div className="flex h-28 w-48 items-center justify-center rounded-xl border-2 border-dashed border-success/40 bg-white p-2 dark:bg-gray-100">
                                    <img
                                        src={entry.approver_signature_url}
                                        alt={`TTD ${entry.approver?.name}`}
                                        className="max-h-full max-w-full rounded-lg object-contain"
                                    />
                                </div>
                                {entry.approver && (
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {entry.approver.name} ·{' '}
                                        {entry.approved_at
                                            ? new Date(
                                                  entry.approved_at,
                                              ).toLocaleString('id-ID', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  hour12: false,
                                                  timeZone: 'Asia/Jakarta',
                                              })
                                            : '-'}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            {/* ── Lampiran Foto ── */}
            {(entry.attachments ?? []).filter(
                (a) => a.inspection_item_id === null,
            ).length > 0 && (
                <Card>
                    <CardHeader className="pt-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Lampiran Foto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {(entry.attachments ?? [])
                                .filter((a) => a.inspection_item_id === null)
                                .map((attachment) => (
                                    <a
                                        key={attachment.id}
                                        href={attachment.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block overflow-hidden rounded-xl border border-border"
                                    >
                                        <img
                                            src={attachment.path}
                                            alt="Lampiran foto"
                                            className="aspect-square w-full object-cover"
                                        />
                                    </a>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ── Delete Entry Dialog ───────────────────────────────────────────────────────
function DeleteEntryDialog({
    entry,
    session,
    isLastEntry,
    open,
    onClose,
}: {
    entry: P2hUserEntry | null;
    session: P2hSession;
    isLastEntry: boolean;
    open: boolean;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        if (!entry) {
            return;
        }

        setProcessing(true);
        router.delete(`/p2h/${session.id}/entries/${entry.id}`, {
            onFinish: () => {
                setProcessing(false);
                onClose();
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Hapus Entry Shift?
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2 pt-1 text-sm text-muted-foreground">
                            {entry && (
                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    <p className="font-semibold text-foreground">
                                        {entry.user?.name ?? '-'}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <ShiftBadge shift={entry.shift} />
                                        {entry.submitted_at && (
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                    entry.submitted_at,
                                                ).toLocaleString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                                                    timeZone: 'Asia/Jakarta',
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <p className="text-warning">
                                Semua jawaban checklist dan tanda tangan entry
                                ini akan dihapus permanen.
                            </p>
                            {isLastEntry && (
                                <p className="font-semibold text-destructive">
                                    Ini adalah entry terakhir. Sesi P2H untuk
                                    unit ini pada tanggal ini akan ikut dihapus
                                    otomatis.
                                </p>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={processing}
                        className="gap-2"
                    >
                        {processing ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Hapus Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function P2hShow({ session, inspectionItems }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>()
        .props;
    const isAdmin = auth?.user?.roles?.includes('admin') ?? false;

    const [entryToDelete, setEntryToDelete] = useState<P2hUserEntry | null>(
        null,
    );

    const entries = [...(session.user_entries ?? [])].sort(
        (a, b) => a.user_slot - b.user_slot,
    );
    const filledEntries = entries;
    const totalTL = filledEntries.reduce(
        (sum, e) =>
            sum +
            (e?.answers?.filter((a) => a.kondisi === 'Tidak Layak').length ??
                0),
        0,
    );
    const isLV = session.unit?.jenis_unit === 'Light Vehicle';

    const formattedDate = session.tanggal
        ? (() => {
              const [y, m, d] = session.tanggal
                  .substring(0, 10)
                  .split('-')
                  .map(Number);

              return new Date(y, m - 1, d);
          })().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : '-';

    // Jika datang dari notifikasi approval, buka tab entry yang di-approve
    const urlEntryId =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('entry')
            : null;
    const targetEntry = urlEntryId
        ? entries.find((e) => String(e.id) === urlEntryId)
        : null;
    const defaultTab = targetEntry
        ? String(targetEntry.user_slot)
        : entries.length > 0
          ? String(entries[0].user_slot)
          : '1';

    return (
        <>
            <Head title={`Detail P2H — ${session.unit?.no_unit ?? ''}`} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 shrink-0"
                    >
                        <Link href="/p2h">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <div
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                    isLV ? 'bg-info-soft' : 'bg-info-soft',
                                )}
                            >
                                {isLV ? (
                                    <Car className="h-5 w-5 text-info" />
                                ) : (
                                    <Bus className="h-5 w-5 text-info" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl leading-tight font-bold">
                                    {session.unit?.no_unit}
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    {session.unit?.jenis_unit}
                                </p>
                            </div>
                            <Badge
                                variant={
                                    session.status === 'completed'
                                        ? 'default'
                                        : 'secondary'
                                }
                                className="ml-auto"
                            >
                                {session.status === 'completed'
                                    ? 'Selesai'
                                    : 'Open'}
                            </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formattedDate}
                            </span>
                            <span className="flex items-center gap-1">
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                {filledEntries.length} pengisian hari ini
                            </span>
                            {session.job_site && (
                                <span className="flex items-center gap-1">
                                    <Wrench className="h-3.5 w-3.5" />
                                    {session.job_site}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Session-level stats ── */}
                <div className="grid grid-cols-4 gap-2">
                    <StatCard label="P2H" value={filledEntries.length} />
                    <StatCard
                        label="Total TL"
                        value={totalTL}
                        variant={totalTL > 0 ? 'danger' : 'default'}
                    />
                    <StatCard label="Item" value={inspectionItems.length} />
                    <StatCard label="Status" value="Open" variant="default" />
                </div>

                {/* ── Export ── */}
                <Button asChild variant="outline" className="gap-2 self-start">
                    <a
                        href={`/p2h/${session.id}/export-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FileText className="h-4 w-4" />
                        Export PDF
                    </a>
                </Button>

                <Separator />

                {/* ── Slot Tabs ── */}
                <Tabs defaultValue={defaultTab}>
                    <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1">
                        {entries.map((entry) => {
                            const slot = entry.user_slot;
                            const slotTL =
                                entry?.answers?.filter(
                                    (a) => a.kondisi === 'Tidak Layak',
                                ).length ?? 0;

                            return (
                                <TabsTrigger
                                    key={slot}
                                    value={String(slot)}
                                    className="relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs data-[state=active]:shadow-sm"
                                >
                                    <span className="font-semibold">
                                        P2H #{slot}
                                    </span>
                                    {slotTL > 0 ? (
                                        <span className="text-xs font-medium text-danger">
                                            {slotTL} TL
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium text-success">
                                            Layak
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'absolute top-1.5 right-1.5 h-2 w-2 rounded-full',
                                            slotTL > 0
                                                ? 'bg-danger'
                                                : 'bg-success',
                                        )}
                                    />
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {entries.map((entry) => {
                        const slot = entry.user_slot;

                        return (
                            <TabsContent key={slot} value={String(slot)}>
                                {isAdmin && (
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                setEntryToDelete(entry)
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Hapus Entry Ini
                                        </Button>
                                    </div>
                                )}
                                <EntryDetail
                                    entry={entry}
                                    inspectionItems={inspectionItems}
                                />
                            </TabsContent>
                        );
                    })}
                </Tabs>

                <DeleteEntryDialog
                    entry={entryToDelete}
                    session={session}
                    isLastEntry={entries.length === 1}
                    open={entryToDelete !== null}
                    onClose={() => setEntryToDelete(null)}
                />

                {/* ── Service Info ── */}
                {session.service_info && (
                    <Card>
                        <CardHeader className="pt-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                Informasi Servis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-4">
                            <div className="flex flex-wrap gap-2">
                                {session.service_info.servis_mingguan && (
                                    <Badge
                                        variant="outline"
                                        className="gap-1.5 text-xs"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-info" />
                                        Servis Mingguan
                                    </Badge>
                                )}
                                {session.service_info.servis_berkala && (
                                    <Badge
                                        variant="outline"
                                        className="gap-1.5 text-xs"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-info" />
                                        Servis Berkala
                                    </Badge>
                                )}
                                {session.service_info.unschedule_breakdown && (
                                    <Badge
                                        variant="destructive"
                                        className="gap-1.5 text-xs"
                                    >
                                        <AlertTriangle className="h-3 w-3" />
                                        Unschedule / Breakdown
                                    </Badge>
                                )}
                                {session.service_info.lainnya && (
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        Lainnya: {session.service_info.lainnya}
                                    </Badge>
                                )}
                            </div>
                            {session.service_info.catatan_servis && (
                                <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="mb-1 text-xs text-muted-foreground">
                                        Catatan Servis
                                    </p>
                                    <p className="text-sm">
                                        {session.service_info.catatan_servis}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Catatan Khusus ── */}
                {session.catatan_khusus && (
                    <Card>
                        <CardHeader className="pt-4 pb-2">
                            <CardTitle className="text-sm font-semibold">
                                Catatan Khusus
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-sm">{session.catatan_khusus}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

P2hShow.layout = {
    breadcrumbs: [
        { title: 'Riwayat P2H', href: '/p2h' },
        { title: 'Detail', href: '#' },
    ],
};
