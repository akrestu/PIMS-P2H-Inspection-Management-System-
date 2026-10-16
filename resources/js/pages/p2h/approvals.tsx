import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Gauge,
    ListChecks,
    Loader2,
    MapPin,
    PenLine,
    ShieldCheck,
    User,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type ReactSignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import SignaturePad from '@/components/P2h/SignaturePad';
import { PageButtons } from '@/components/pagination-bar';
import { FilterChips } from '@/components/pims/filter-chips';
import { PageHeader } from '@/components/pims/page-header';
import { Segmented } from '@/components/pims/segmented';
import { KritisTag, StatusPill } from '@/components/pims/status-pill';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { ApprovalStatus } from '@/types/pims';

/* ─────────────────────── Types ─────────────────────────────── */
interface ApprovalEntry {
    id: number;
    session_id: number;
    no_unit: string;
    jenis_unit: string;
    department: string;
    tanggal: string;
    shift: string | null;
    driver_name: string;
    driver_nik: string;
    driver_jabatan: string;
    kondisi_akhir: 'Layak Pakai' | 'BD' | null;
    approval_status: ApprovalStatus | null;
    catatan_approval: string | null;
    pic_approver_id: number | null;
    pic_name: string | null;
    approver_name: string | null;
    approver_signature_url: string | null;
    approved_at: string | null;
    submitted_at: string | null;
    score: number;
    tl_count: number;
    has_critical: boolean;
    escalated: boolean;
}

interface ChecklistAnswerDetail {
    inspection_item_id: number;
    section: 'A' | 'B' | 'C';
    nama_item: string;
    kode_bahaya: 'AA' | 'A' | null;
    kondisi: 'Layak' | 'Tidak Layak' | null;
    keterangan: string | null;
}

interface EntryDetail {
    id: number;
    session_id: number;
    no_unit: string;
    jenis_unit: string;
    department: string;
    tanggal: string;
    shift: string | null;
    lokasi_kerja: string | null;
    km_awal: number | null;
    hm_km_akhir: number | null;
    driver_name: string;
    driver_nik: string;
    driver_jabatan: string;
    kondisi_akhir: 'Layak Pakai' | 'BD' | null;
    justifikasi_kondisi: string | null;
    paraf_url: string | null;
    submitted_at: string | null;
    approval_status: ApprovalStatus | null;
    fuel_log: { km_unit: number | null; jumlah_liter: number | null } | null;
    score: number;
    tl_count: number;
    grouped_answers: Record<string, ChecklistAnswerDetail[]>;
    attachments: { url: string }[];
}

interface PaginatedEntries {
    data: ApprovalEntry[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    entries: PaginatedEntries;
    filters: { status?: string };
    canSeeAllDept: boolean;
    stats: { pending: number; approved_today: number; rejected_today: number };
    /** Jumlah pending yang bisa di-approve massal; null bila bukan admin. */
    bulkApprovable: number | null;
}

/* ─────────────────── Constants ─────────────────────────────── */
const SECTION_LABELS: Record<string, string> = {
    A: 'Seksi A — Pemeriksaan Luar Kabin',
    B: 'Seksi B — Pemeriksaan Dalam Kabin',
    C: 'Seksi C — Perlengkapan Tambahan',
};

/* ─────────────────── Status Badge ──────────────────────────── */
function ApprovalStatusBadge({ status }: { status: ApprovalStatus | null }) {
    if (!status) {
        return null;
    }

    const config = {
        pending: {
            label: 'Menunggu',
            icon: Clock,
            cls: 'bg-warning-soft text-warning border-warning/40   ',
        },
        approved: {
            label: 'Disetujui',
            icon: CheckCircle2,
            cls: 'bg-success-soft text-success border-success/40   ',
        },
        rejected: {
            label: 'Ditolak',
            icon: XCircle,
            cls: 'bg-danger-soft text-danger border-danger/40   ',
        },
    };
    const { label, icon: Icon, cls } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

/* ─────────────── Reject Dialog ─────────────────────────────── */
function RejectDialog({
    entry,
    open,
    onClose,
}: {
    entry: ApprovalEntry | null;
    open: boolean;
    onClose: () => void;
}) {
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        if (!entry || !catatan.trim()) {
            return;
        }

        setProcessing(true);
        router.patch(
            `/p2h/entries/${entry.id}/reject`,
            { catatan },
            {
                onFinish: () => {
                    setProcessing(false);
                    onClose();
                    setCatatan('');
                },
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
                        <XCircle className="h-6 w-6 text-danger" />
                    </div>
                    <DialogTitle className="text-center">
                        Tolak P2H?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        P2H unit <strong>{entry?.no_unit}</strong> oleh{' '}
                        <strong>{entry?.driver_name}</strong> akan ditolak.
                        Driver akan mendapat notifikasi untuk melakukan
                        pengisian ulang.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        Catatan Penolakan{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Jelaskan alasan penolakan kepada driver..."
                        className="min-h-[90px] resize-none"
                        maxLength={500}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                        {catatan.length}/500
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={processing}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={submit}
                        disabled={!catatan.trim() || processing}
                        className="flex-1"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Menolak…
                            </>
                        ) : (
                            'Tolak P2H'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────── Review & Approve Sheet ───────────────────────── */
function ReviewApproveSheet({
    entry,
    open,
    onClose,
    onReject,
}: {
    entry: ApprovalEntry | null;
    open: boolean;
    onClose: () => void;
    onReject: () => void;
}) {
    const [detail, setDetail] = useState<EntryDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [sigEmpty, setSigEmpty] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [catatan, setCatatan] = useState('');
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);

    useEffect(() => {
        if (!open || !entry) {
            return;
        }

        if (detail?.id === entry.id) {
            return;
        }

        setLoading(true);
        setDetail(null);
        setSigEmpty(true);
        setCatatan('');
        fetch(`/p2h/entries/${entry.id}/detail`)
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }

                return r.json();
            })
            .then((data) => {
                setDetail(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Gagal memuat detail P2H. Coba lagi.');
                setLoading(false);
                onClose();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry?.id]);

    const handleApprove = () => {
        if (!entry) {
            return;
        }

        if (sigEmpty || sigPadRef.current?.isEmpty()) {
            toast.error('Tanda tangan wajib dibuat sebelum menyetujui.');

            return;
        }

        const signature = sigPadRef.current?.toDataURL('image/png') ?? '';

        if (signature.length > 2 * 1024 * 1024) {
            toast.error(
                'Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.',
            );

            return;
        }

        setProcessing(true);
        router.patch(
            `/p2h/entries/${entry.id}/approve`,
            { signature, catatan: catatan.trim() || null },
            {
                onFinish: () => {
                    setProcessing(false);
                    onClose();
                },
            },
        );
    };

    const groupedSections = detail
        ? Object.entries(detail.grouped_answers)
        : [];
    const hasCritical = entry?.has_critical;

    return (
        <Sheet
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    onClose();
                }
            }}
        >
            <SheetContent
                side="bottom"
                className="flex h-[95dvh] flex-col rounded-t-2xl p-0"
            >
                {/* Header */}
                <SheetHeader className="shrink-0 border-b px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <SheetTitle className="text-base">
                                Review P2H — {entry?.no_unit}
                            </SheetTitle>
                            <p className="text-sm text-muted-foreground">
                                {entry?.driver_name} · {entry?.tanggal} ·{' '}
                                {entry?.shift ?? '-'}
                            </p>
                        </div>
                        {hasCritical && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                                <AlertCircle className="h-3 w-3" /> CRITICAL
                            </span>
                        )}
                    </div>
                </SheetHeader>

                {loading && (
                    <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Memuat detail P2H…
                    </div>
                )}

                {!loading && detail && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex flex-col gap-5 p-4 pb-6">
                            {/* Stats mini: skor + TL + kondisi */}
                            <div className="grid grid-cols-3 gap-3">
                                <div
                                    className={`rounded-xl border p-3 text-center ${detail.score < 80 ? 'border-danger/40 bg-danger-soft' : 'border-success/40 bg-success-soft'}`}
                                >
                                    <p
                                        className={`text-2xl font-semibold ${detail.score < 80 ? 'text-danger' : 'text-success'}`}
                                    >
                                        {detail.score}%
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Skor
                                    </p>
                                </div>
                                <div
                                    className={`rounded-xl border p-3 text-center ${detail.tl_count > 0 ? 'border-warning/40 bg-warning-soft' : 'border-success/40 bg-success-soft'}`}
                                >
                                    <p
                                        className={`text-2xl font-semibold ${detail.tl_count > 0 ? 'text-warning' : 'text-success'}`}
                                    >
                                        {detail.tl_count}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Tidak Layak
                                    </p>
                                </div>
                                <div
                                    className={`rounded-xl border p-3 text-center ${detail.kondisi_akhir === 'BD' ? 'border-danger/40 bg-danger-soft' : 'border-success/40 bg-success-soft'}`}
                                >
                                    <p
                                        className={`text-2xl font-semibold ${detail.kondisi_akhir === 'BD' ? 'text-danger' : 'text-success'}`}
                                    >
                                        {detail.kondisi_akhir === 'BD'
                                            ? 'BD'
                                            : 'OK'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Kondisi
                                    </p>
                                </div>
                            </div>

                            {/* Info umum */}
                            <div className="divide-y rounded-xl border bg-muted/30 text-sm">
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 text-muted-foreground">
                                        Driver
                                    </span>
                                    <span className="font-medium">
                                        {detail.driver_name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 text-muted-foreground">
                                        Unit
                                    </span>
                                    <span className="font-medium">
                                        {detail.no_unit} · {detail.jenis_unit}
                                    </span>
                                </div>
                                {detail.lokasi_kerja && (
                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 text-muted-foreground">
                                            Lokasi Kerja
                                        </span>
                                        <span className="font-medium">
                                            {detail.lokasi_kerja}
                                        </span>
                                    </div>
                                )}
                                {detail.km_awal != null && (
                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                        <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 text-muted-foreground">
                                            HM/KM Awal
                                        </span>
                                        <span className="font-medium">
                                            {detail.km_awal.toLocaleString(
                                                'id-ID',
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Justifikasi kondisi */}
                            {detail.justifikasi_kondisi && (
                                <div className="rounded-lg border border-warning/40 bg-warning-soft p-3">
                                    <p className="mb-1 text-xs font-semibold text-warning">
                                        Justifikasi Kondisi Driver:
                                    </p>
                                    <p className="text-sm text-warning">
                                        {detail.justifikasi_kondisi}
                                    </p>
                                </div>
                            )}

                            {/* Tanda tangan driver */}
                            {detail.paraf_url && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Tanda Tangan Driver
                                    </p>
                                    <div className="flex justify-center rounded-xl border bg-white p-3">
                                        <img
                                            src={detail.paraf_url}
                                            alt="Tanda tangan driver"
                                            className="max-h-20 object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Checklist per seksi */}
                            <div className="space-y-4">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Checklist Inspeksi
                                </p>
                                {groupedSections.map(([section, items]) => {
                                    const tlItems = items.filter(
                                        (i) => i.kondisi === 'Tidak Layak',
                                    );
                                    const hasAA = tlItems.some(
                                        (i) => i.kode_bahaya === 'AA',
                                    );

                                    return (
                                        <div
                                            key={section}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">
                                                    {SECTION_LABELS[section] ??
                                                        `Seksi ${section}`}
                                                </p>
                                                {hasAA && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                                                        <AlertCircle className="h-3 w-3" />{' '}
                                                        STOP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="divide-y overflow-hidden rounded-xl border">
                                                {items.map((item) => {
                                                    const isTL =
                                                        item.kondisi ===
                                                        'Tidak Layak';

                                                    return (
                                                        <div
                                                            key={
                                                                item.inspection_item_id
                                                            }
                                                            className={`px-3 py-2.5 text-sm ${isTL ? 'bg-danger-soft' : ''}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex min-w-0 items-start gap-2">
                                                                    {item.kode_bahaya ===
                                                                        'AA' &&
                                                                        isTL && (
                                                                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                                                                        )}
                                                                    <span
                                                                        className={
                                                                            isTL
                                                                                ? 'font-medium text-danger'
                                                                                : 'text-foreground'
                                                                        }
                                                                    >
                                                                        {
                                                                            item.nama_item
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span
                                                                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                                                                        isTL
                                                                            ? 'bg-danger-soft text-danger'
                                                                            : 'bg-success-soft text-success'
                                                                    }`}
                                                                >
                                                                    {item.kondisi ??
                                                                        '-'}
                                                                </span>
                                                            </div>
                                                            {isTL &&
                                                                item.keterangan && (
                                                                    <p className="mt-1 pl-5 text-xs text-danger">
                                                                        Ket:{' '}
                                                                        {
                                                                            item.keterangan
                                                                        }
                                                                    </p>
                                                                )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Lampiran foto unit */}
                            {detail.attachments.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold">
                                        Lampiran Foto Unit
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {detail.attachments.map((att, i) => (
                                            <a
                                                key={i}
                                                href={att.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <img
                                                    src={att.url}
                                                    alt={`Foto unit ${i + 1}`}
                                                    className="aspect-video w-full rounded-lg border object-cover"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Catatan approval */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Catatan Approval{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <Textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    placeholder="Tuliskan catatan atau pesan untuk driver..."
                                    className="min-h-[72px] resize-none"
                                    maxLength={500}
                                />
                                <p className="text-right text-xs text-muted-foreground">
                                    {catatan.length}/500
                                </p>
                            </div>

                            {/* Signature section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <PenLine className="h-4 w-4 text-foreground" />
                                    <p className="text-sm font-semibold">
                                        Tanda Tangan Persetujuan
                                    </p>
                                    <span className="text-destructive">*</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Dengan menandatangani, Anda menyatakan telah
                                    mereview dan menyetujui P2H ini.
                                </p>
                                <SignaturePad
                                    sigPadRef={sigPadRef}
                                    penColor="#1d4ed8"
                                    onEnd={() => setSigEmpty(false)}
                                    onClear={() => setSigEmpty(true)}
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-danger/40 text-danger hover:border-danger/40 hover:bg-danger-soft"
                                    onClick={() => {
                                        onClose();
                                        onReject();
                                    }}
                                >
                                    <XCircle className="mr-1.5 h-4 w-4" />
                                    Tolak P2H
                                </Button>
                                <Button
                                    className="flex-1 bg-success text-white hover:bg-success"
                                    disabled={sigEmpty || processing}
                                    onClick={handleApprove}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Menyetujui…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="mr-1.5 h-4 w-4" />
                                            Setujui & Tanda Tangan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

/* ─────────────── Bulk Approve Dialog (admin) ───────────────── */
function BulkApproveDialog({
    open,
    onClose,
    approvable,
    pending,
}: {
    open: boolean;
    onClose: () => void;
    approvable: number;
    pending: number;
}) {
    const [catatan, setCatatan] = useState('');
    const [sigEmpty, setSigEmpty] = useState(true);
    const [processing, setProcessing] = useState(false);
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);
    const skipped = Math.max(0, pending - approvable);

    const reset = () => {
        setCatatan('');
        setSigEmpty(true);
        sigPadRef.current?.clear();
    };

    const submit = () => {
        if (sigEmpty || sigPadRef.current?.isEmpty()) {
            toast.error('Tanda tangan wajib dibuat sebelum menyetujui.');

            return;
        }

        const signature = sigPadRef.current?.toDataURL('image/png') ?? '';

        if (signature.length > 2 * 1024 * 1024) {
            toast.error(
                'Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.',
            );

            return;
        }

        setProcessing(true);
        router.post(
            '/p2h/approvals/bulk-approve',
            { signature, catatan: catatan.trim() || null },
            {
                onFinish: () => {
                    setProcessing(false);
                    reset();
                    onClose();
                },
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o && !processing) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                        <ListChecks className="h-6 w-6 text-success" />
                    </div>
                    <DialogTitle className="text-center">
                        Setujui {approvable} P2H sekaligus?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Semua P2H LV yang menunggu akan disetujui atas nama Anda
                        dengan satu tanda tangan. Driver akan menerima
                        notifikasi persetujuan.
                    </DialogDescription>
                </DialogHeader>

                {skipped > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            {skipped} P2H tidak ikut disetujui karena memiliki
                            item Critical (AA) Tidak Layak atau milik Anda
                            sendiri. Review satu per satu.
                        </span>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        Catatan (opsional)
                    </Label>
                    <Textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Default: Disetujui massal oleh admin (PIC tidak merespons)."
                        className="min-h-[64px] resize-none"
                        maxLength={500}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        Tanda Tangan Persetujuan{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <SignaturePad
                        sigPadRef={sigPadRef}
                        penColor="#1d4ed8"
                        onEnd={() => setSigEmpty(false)}
                        onClear={() => setSigEmpty(true)}
                    />
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={processing}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={sigEmpty || processing}
                        className="flex-1 bg-success text-white hover:bg-success"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Menyetujui…
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="mr-1.5 h-4 w-4" />
                                Setujui {approvable} P2H
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────── Entry Card ────────────────────────────────── */
/**
 * Geser kartu (docs/03): kanan = buka tinjau & setujui (tanda tangan tetap wajib),
 * kiri = tolak. Ambang 96px; hanya sentuhan, tombol tetap tersedia sebagai alternatif.
 */
function useSwipe(onRight: () => void, onLeft: () => void, enabled: boolean) {
    const start = useRef<{ x: number; y: number } | null>(null);
    const [dx, setDx] = useState(0);

    if (!enabled) {
        return { dx: 0, handlers: {} };
    }

    return {
        dx,
        handlers: {
            onPointerDown: (e: React.PointerEvent) => {
                if (e.pointerType === 'touch') {
                    start.current = { x: e.clientX, y: e.clientY };
                }
            },
            onPointerMove: (e: React.PointerEvent) => {
                if (!start.current) {
                    return;
                }

                const x = e.clientX - start.current.x;
                const y = e.clientY - start.current.y;

                if (Math.abs(y) > Math.abs(x)) {
                    return;
                }

                setDx(Math.max(-140, Math.min(140, x)));
            },
            onPointerUp: () => {
                if (dx >= 96) {
                    onRight();
                } else if (dx <= -96) {
                    onLeft();
                }

                start.current = null;
                setDx(0);
            },
            onPointerCancel: () => {
                start.current = null;
                setDx(0);
            },
        },
    };
}

function EntryCard({
    entry,
    onReview,
    onReject,
    active = false,
}: {
    entry: ApprovalEntry;
    onReview: (e: ApprovalEntry) => void;
    onReject: (e: ApprovalEntry) => void;
    active?: boolean;
}) {
    const pending = entry.approval_status === 'pending';
    const { dx, handlers } = useSwipe(
        () => onReview(entry),
        () => onReject(entry),
        pending,
    );

    return (
        <div className="relative overflow-hidden rounded-xl">
            {dx !== 0 && (
                <div
                    aria-hidden
                    className={`absolute inset-0 flex items-center px-6 text-sm font-semibold ${
                        dx > 0
                            ? 'justify-start bg-success-soft text-success'
                            : 'justify-end bg-danger-soft text-danger'
                    }`}
                >
                    {dx > 0 ? 'Tinjau & setujui' : 'Tolak'}
                </div>
            )}
            <div
                data-active={active || undefined}
                {...handlers}
                style={dx ? { transform: `translateX(${dx}px)` } : undefined}
                className={`relative flex touch-pan-y flex-col gap-3 rounded-xl border bg-card p-4 transition-[box-shadow,transform] duration-200 hover:shadow-sm data-[active]:ring-2 data-[active]:ring-ring ${
                    entry.has_critical ? 'border-danger/40' : 'border-border'
                }`}
            >
                {/* Critical banner */}
                {entry.has_critical && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Ada item Critical (AA) Tidak Layak — perlu perhatian
                        khusus
                    </div>
                )}

                {/* Escalation banner */}
                {entry.escalated && entry.approval_status === 'pending' && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        Dieskalasi ke admin — PIC belum merespons sampai akhir
                        shift
                    </div>
                )}

                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-base leading-tight font-bold">
                            {entry.no_unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {entry.department}
                        </p>
                    </div>
                    <ApprovalStatusBadge status={entry.approval_status} />
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Driver</p>
                        <p className="truncate font-medium">
                            {entry.driver_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {entry.driver_jabatan}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Tanggal · Shift
                        </p>
                        <p className="font-medium">{entry.tanggal}</p>
                        <p className="text-xs text-muted-foreground">
                            {entry.shift ?? '-'}
                        </p>
                    </div>
                </div>

                {/* Score + kondisi bar */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex-1 text-center">
                        <p
                            className={`text-lg font-semibold tabular-nums ${entry.score < 80 ? 'text-danger' : 'text-success'}`}
                        >
                            {entry.score}%
                        </p>
                        <p className="text-xs text-muted-foreground">Skor</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex-1 text-center">
                        <p
                            className={`text-lg font-semibold tabular-nums ${entry.tl_count > 0 ? 'text-warning' : 'text-success'}`}
                        >
                            {entry.tl_count}
                        </p>
                        <p className="text-xs text-muted-foreground">TL</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex-1 text-center">
                        <p
                            className={`text-sm font-bold ${entry.kondisi_akhir === 'BD' ? 'text-danger' : 'text-success'}`}
                        >
                            {entry.kondisi_akhir ?? '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">Kondisi</p>
                    </div>
                </div>

                {/* Catatan approval/rejection */}
                {entry.catatan_approval && (
                    <div
                        className={`rounded-lg border p-2.5 ${
                            entry.approval_status === 'rejected'
                                ? 'border-danger/40 bg-danger-soft'
                                : 'border-success/40 bg-success-soft'
                        }`}
                    >
                        <p
                            className={`text-xs ${entry.approval_status === 'rejected' ? 'text-danger' : 'text-success'}`}
                        >
                            <span className="font-semibold">Catatan:</span>{' '}
                            {entry.catatan_approval}
                        </p>
                    </div>
                )}

                {/* Approver info */}
                {entry.approver_name && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 text-xs text-muted-foreground">
                            {entry.approval_status === 'approved' ? (
                                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-success" />
                            ) : (
                                <XCircle className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-danger" />
                            )}
                            {entry.approval_status === 'approved'
                                ? 'Disetujui'
                                : 'Ditolak'}{' '}
                            oleh{' '}
                            <span className="font-medium text-foreground">
                                {entry.approver_name}
                            </span>
                            {entry.approved_at && <> · {entry.approved_at}</>}
                        </div>
                        {entry.approver_signature_url && (
                            <div className="rounded-lg border bg-white p-1">
                                <img
                                    src={entry.approver_signature_url}
                                    alt="TTD"
                                    className="h-8 object-contain"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 border-t pt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                    >
                        <Link href={`/p2h/${entry.session_id}`}>
                            Lihat Detail
                        </Link>
                    </Button>
                    {entry.approval_status === 'pending' && (
                        <Button
                            size="sm"
                            className="flex-1 bg-primary text-primary-foreground"
                            onClick={() => onReview(entry)}
                        >
                            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                            Review & Setujui
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ──────────────────── Status Filter ────────────────────────── */
function StatusFilterTab({
    label,
    icon: Icon,
    active,
    onClick,
}: {
    value: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
/* ────────── Desktop master–detail (Persetujuan-Desktop.png) ────────── */

function minutesSince(iso: string | null): number | null {
    if (!iso) {
        return null;
    }

    const t = new Date(iso).getTime();

    return Number.isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 60000));
}

function submittedTime(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    return Number.isNaN(d.getTime())
        ? iso.slice(11, 16)
        : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace('.', ':');
}

type QueueFilter = 'semua' | 'eskalasi' | 'rusak';

function QueueRow({
    entry,
    selected,
    onSelect,
}: {
    entry: ApprovalEntry;
    selected: boolean;
    onSelect: () => void;
}) {
    const age = entry.approval_status === 'pending' ? minutesSince(entry.submitted_at) : null;
    const bd = entry.kondisi_akhir === 'BD';

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-current={selected ? 'true' : undefined}
            data-active={selected ? 'true' : undefined}
            className={cn(
                'relative flex w-full flex-col gap-1.5 border-b-(length:--bw) px-4 py-3.5 text-left transition-colors',
                selected ? 'bg-muted' : 'hover:bg-muted/50',
            )}
        >
            {selected && (
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
            )}
            <span className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold tnum">{entry.no_unit}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                    {entry.driver_name}
                </span>
                {age !== null && (
                    <span className={cn('text-xs font-semibold tnum', age > 15 ? 'text-danger' : 'text-muted-foreground')}>
                        {age < 600 ? `${age} mnt` : submittedTime(entry.submitted_at)}
                    </span>
                )}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <StatusPill
                    status={bd ? 'tidak-layak' : 'layak'}
                    label={bd ? 'Tidak layak' : 'Layak'}
                    size="sm"
                    solid={bd}
                />
                <span className="tnum">
                    {entry.tl_count > 0 ? `${entry.tl_count} Rusak` : 'Semua baik'}
                </span>
                {entry.has_critical && <KritisTag />}
                {entry.escalated && (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                        Eskalasi
                    </span>
                )}
            </span>
        </button>
    );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-[12px] bg-muted-2 px-4 py-3 ring-1 ring-border ring-inset">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-lg font-semibold tnum">{value}</p>
        </div>
    );
}

function ApprovalDetailPanel({
    entry,
    onReject,
    approveRef,
    onApproved,
}: {
    entry: ApprovalEntry;
    onReject: () => void;
    approveRef: React.MutableRefObject<(() => void) | null>;
    onApproved: () => void;
}) {
    const [detail, setDetail] = useState<EntryDetail | null>(null);
    const [error, setError] = useState(false);
    const [sigEmpty, setSigEmpty] = useState(true);
    const [sigError, setSigError] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);
    const pending = entry.approval_status === 'pending';

    useEffect(() => {
        // Panel di-mount ulang per entry (key), jadi state awal sudah bersih
        let cancelled = false;
        fetch(`/p2h/entries/${entry.id}/detail`)
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }

                return r.json();
            })
            .then((data) => !cancelled && setDetail(data))
            .catch(() => !cancelled && setError(true));

        return () => {
            cancelled = true;
        };
    }, [entry.id]);

    const approve = () => {
        if (!pending || processing) {
            return;
        }

        // Tombol tetap bisa diklik; error tampil di tempat (docs/02#button)
        if (sigEmpty || sigPadRef.current?.isEmpty()) {
            setSigError(true);
            document.getElementById('approver-signature')?.scrollIntoView({ block: 'center', behavior: 'smooth' });

            return;
        }

        const signature = sigPadRef.current?.toDataURL('image/png') ?? '';
        setProcessing(true);
        router.patch(
            `/p2h/entries/${entry.id}/approve`,
            { signature, catatan: null },
            {
                preserveScroll: true,
                onSuccess: onApproved,
                onFinish: () => setProcessing(false),
            },
        );
    };

    // Pintasan "A" di halaman memanggil aksi setujui panel ini
    useEffect(() => {
        approveRef.current = approve;
    });

    const answers = detail ? Object.values(detail.grouped_answers).flat() : [];
    const broken = answers.filter((a) => a.kondisi === 'Tidak Layak');
    const okCount = answers.filter((a) => a.kondisi === 'Layak').length;
    const bd = entry.kondisi_akhir === 'BD';
    const age = pending ? minutesSince(entry.submitted_at) : null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
                            {entry.no_unit} · {entry.jenis_unit}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground tnum">
                            {entry.driver_name} · submit {submittedTime(entry.submitted_at)}
                            {entry.shift && ` · ${entry.shift}`}
                            {entry.department && ` · ${entry.department}`}
                            {age !== null && age < 600 && ` · menunggu ${age} mnt`}
                        </p>
                    </div>
                    <StatusPill
                        status={bd ? 'tidak-layak' : 'layak'}
                        label={bd ? 'Tidak layak' : 'Layak Pakai'}
                        solid={bd}
                        className="h-7 px-3 text-[13px]"
                    />
                </header>

                {entry.escalated && pending && (
                    <p className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger hc:border-2 hc:border-danger">
                        Dieskalasi karena PIC belum menyetujui sampai akhir shift.
                    </p>
                )}
                {bd && (
                    <p className="rounded-[12px] border-(length:--bw) px-4 py-3 text-sm">
                        Unit sudah otomatis <b>BD</b> dari P2H ini. Menyetujui = mengonfirmasi
                        hasil P2H; unit tetap BD sampai temuan ditutup.
                    </p>
                )}
                {!pending && (
                    <p className="rounded-[12px] bg-muted px-4 py-3 text-sm">
                        {entry.approval_status === 'approved'
                            ? `Disetujui ${entry.approver_name ?? ''}${entry.approved_at ? ` · ${entry.approved_at}` : ''}`
                            : `Ditolak${entry.approver_name ? ` oleh ${entry.approver_name}` : ''}${entry.catatan_approval ? ` — ${entry.catatan_approval}` : ''}`}
                    </p>
                )}

                {error && (
                    <p className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">
                        Detail gagal dimuat. Pilih ulang entry untuk mencoba lagi.
                    </p>
                )}
                {!detail && !error && (
                    <div className="space-y-3" aria-busy="true">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="h-[68px] skeleton" />
                            <div className="h-[68px] skeleton" />
                            <div className="h-[68px] skeleton" />
                        </div>
                        <div className="h-24 skeleton" />
                    </div>
                )}

                {detail && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <StatTile
                                label="HM/KM awal"
                                value={detail.km_awal != null ? detail.km_awal.toLocaleString('id-ID') : '—'}
                            />
                            <StatTile
                                label="Isi BBM"
                                value={
                                    detail.fuel_log?.jumlah_liter != null
                                        ? `${detail.fuel_log.jumlah_liter.toLocaleString('id-ID')} L`
                                        : '—'
                                }
                            />
                            <StatTile
                                label="Checklist"
                                value={`${okCount} Baik · ${broken.length} Rusak`}
                            />
                        </div>

                        {detail.justifikasi_kondisi && (
                            <div>
                                <h3 className="text-sm font-semibold">Catatan driver</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {detail.justifikasi_kondisi}
                                </p>
                            </div>
                        )}

                        <section>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    {broken.length > 0 ? 'Item rusak' : 'Checklist'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAll((v) => !v)}
                                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {showAll ? 'Sembunyikan item baik' : `Lihat semua ${answers.length} item`}
                                </button>
                            </div>
                            {broken.length === 0 && !showAll && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Semua {answers.length} item dalam kondisi baik.
                                </p>
                            )}
                            <ul className="mt-2 space-y-2">
                                {(showAll ? answers : broken).map((item) => {
                                    const isTL = item.kondisi === 'Tidak Layak';

                                    return (
                                        <li
                                            key={item.inspection_item_id}
                                            className={cn(
                                                'rounded-[12px] border-(length:--bw) px-4 py-3',
                                                !isTL && 'py-2.5',
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={cn('min-w-0 flex-1 text-sm', isTL && 'font-semibold')}>
                                                    {item.nama_item}
                                                </span>
                                                {isTL && item.kode_bahaya === 'AA' && <KritisTag />}
                                                <StatusPill
                                                    status={isTL ? 'tidak-layak' : 'layak'}
                                                    label={isTL ? 'Rusak' : 'Baik'}
                                                    size="sm"
                                                />
                                            </div>
                                            {isTL && item.keterangan && (
                                                <p className="mt-1 text-[13px] text-muted-foreground">
                                                    {item.keterangan}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            {broken.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Temuan sudah dibuat otomatis saat P2H masuk; dibatalkan bila P2H ditolak.
                                </p>
                            )}
                        </section>

                        {detail.attachments.length > 0 && (
                            <section>
                                <h3 className="text-sm font-semibold">Foto lampiran</h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {detail.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noreferrer">
                                            <img
                                                src={att.url}
                                                alt={`Foto unit ${i + 1}`}
                                                className="h-[110px] w-40 rounded-[10px] border object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}

                        {detail.paraf_url && (
                            <section>
                                <h3 className="text-sm font-semibold">Tanda tangan driver</h3>
                                <img
                                    src={detail.paraf_url}
                                    alt={`Tanda tangan ${detail.driver_name}`}
                                    className="mt-2 h-16 rounded-[10px] border bg-white object-contain px-3"
                                />
                            </section>
                        )}

                        {pending && (
                            <section id="approver-signature">
                                <h3 className="text-sm font-semibold">
                                    Tanda tangan approver <span className="text-danger">*</span>
                                </h3>
                                <div className="mt-2">
                                    <SignaturePad
                                        sigPadRef={sigPadRef}
                                        penColor="#1d4ed8"
                                        onEnd={() => {
                                            setSigEmpty(false);
                                            setSigError(false);
                                        }}
                                        onClear={() => setSigEmpty(true)}
                                    />
                                </div>
                                {sigError && (
                                    <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
                                        Buat tanda tangan dulu sebelum menyetujui.
                                    </p>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>

            {pending && (
                <footer className="flex items-center justify-between gap-3 border-t-(length:--bw) bg-background px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={onReject}
                        className="border-danger/40 text-danger hover:bg-danger-soft hover:text-danger"
                    >
                        Tolak
                        <kbd className="font-mono text-[10px] opacity-60">R</kbd>
                    </Button>
                    <Button onClick={approve} disabled={processing || !detail}>
                        {processing && <Loader2 className="animate-spin" />}
                        Setujui P2H
                        <kbd className="font-mono text-[10px] opacity-60">A</kbd>
                    </Button>
                </footer>
            )}
        </div>
    );
}

export default function P2hApprovals({
    entries,
    filters,
    canSeeAllDept,
    stats,
    bulkApprovable,
}: Props) {
    const [rejectEntry, setRejectEntry] = useState<ApprovalEntry | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [reviewEntry, setReviewEntry] = useState<ApprovalEntry | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);

    const activeStatus = filters.status ?? 'pending';
    const [activeIndex, setActiveIndex] = useState(0);
    const isDesktop = useIsDesktop();
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('semua');
    const approveRef = useRef<(() => void) | null>(null);
    const queue = entries.data.filter((e) =>
        queueFilter === 'eskalasi'
            ? e.escalated
            : queueFilter === 'rusak'
              ? e.tl_count > 0
              : true,
    );
    const selectedIndex = Math.min(activeIndex, Math.max(0, queue.length - 1));
    const selected = queue[selectedIndex] ?? null;
    const escalatedCount = entries.data.filter((e) => e.escalated).length;

    const openReview = (entry: ApprovalEntry) => {
        setReviewEntry(entry);
        setReviewOpen(true);
    };
    const closeReview = () => setReviewOpen(false);
    const openRejectFromReview = () => {
        setReviewOpen(false);
        setTimeout(() => setRejectEntry(reviewEntry), 150);
    };

    // Pintasan keyboard desktop (docs/03): ↑/↓ atau k/j pilih, A/Enter tinjau, R tolak
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;

            if (
                reviewOpen ||
                rejectEntry ||
                bulkOpen ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey ||
                (t &&
                    (t.isContentEditable ||
                        ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)))
            ) {
                return;
            }

            const list = isDesktop ? queue : entries.data;

            if (list.length === 0) {
                return;
            }

            const current = list[Math.min(activeIndex, list.length - 1)];
            const key = e.key.toLowerCase();

            if (key === 'arrowdown' || key === 'j') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, list.length - 1));
            } else if (key === 'arrowup' || key === 'k') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (isDesktop && key === 'a' && current) {
                // Desktop: setujui langsung dari panel detail (butuh tanda tangan)
                e.preventDefault();
                approveRef.current?.();
            } else if ((key === 'a' || key === 'enter') && current && !isDesktop) {
                e.preventDefault();
                openReview(current);
            } else if (
                key === 'r' &&
                current &&
                current.approval_status === 'pending'
            ) {
                e.preventDefault();
                setRejectEntry(current);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    });

    useEffect(() => {
        document
            .querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const setStatus = (s: string) => {
        router.get(
            '/p2h/approvals',
            { status: s },
            { preserveState: true, replace: true },
        );
    };

    const emptyMessages = {
        pending: {
            title: 'Tidak ada P2H menunggu persetujuan',
            desc: 'Semua P2H LV sudah terverifikasi. ',
        },
        approved: {
            title: 'Belum ada P2H yang disetujui',
            desc: 'P2H yang disetujui akan muncul di sini.',
        },
        rejected: {
            title: 'Belum ada P2H yang ditolak',
            desc: 'P2H yang ditolak akan muncul di sini.',
        },
    };
    const emptyMsg =
        emptyMessages[activeStatus as keyof typeof emptyMessages] ??
        emptyMessages.pending;

    return (
        <>
            <Head title="Persetujuan P2H LV" />

            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <PageHeader
                    title="Persetujuan"
                    description={
                        activeStatus === 'pending'
                            ? `${stats.pending} menunggu${escalatedCount > 0 ? ` · ${escalatedCount} eskalasi` : ''} · ${canSeeAllDept ? 'semua departemen' : 'Anda sebagai PIC'}`
                            : `${stats.approved_today} disetujui · ${stats.rejected_today} ditolak hari ini`
                    }
                    actions={
                        <>
                            <span className="mr-2 hidden font-mono text-xs text-muted-foreground xl:inline">
                                ↑↓ pindah · A setujui · R tolak
                            </span>
                            <Segmented
                                className="hidden lg:inline-flex"
                                label="Status persetujuan"
                                value={activeStatus}
                                onChange={setStatus}
                                options={[
                                    { value: 'pending', label: 'Menunggu' },
                                    { value: 'approved', label: 'Disetujui' },
                                    { value: 'rejected', label: 'Ditolak' },
                                ]}
                            />
                            {
                                // Approve massal — khusus admin
                                bulkApprovable !== null &&
                                    activeStatus === 'pending' &&
                                    bulkApprovable > 0 && (
                                        <Button onClick={() => setBulkOpen(true)}>
                                            <ListChecks />
                                            Setujui semua ({bulkApprovable})
                                        </Button>
                                    )
                            }
                        </>
                    }
                />

                {/* ── Desktop: master–detail ── */}
                <div className="hidden h-[calc(100svh-150px)] min-h-[560px] grid-cols-[minmax(320px,380px)_1fr] overflow-hidden rounded-[14px] border-(length:--bw) lg:grid">
                    <div className="flex min-h-0 flex-col border-r-(length:--bw)">
                        <div className="border-b-(length:--bw) px-4 py-3">
                            <FilterChips
                                label="Filter antrean"
                                value={queueFilter}
                                onChange={(v) => {
                                    setQueueFilter(v);
                                    setActiveIndex(0);
                                }}
                                options={[
                                    { value: 'semua', label: 'Semua', count: entries.data.length },
                                    { value: 'eskalasi', label: 'Eskalasi', count: escalatedCount },
                                    { value: 'rusak', label: 'Ada rusak', count: entries.data.filter((e) => e.tl_count > 0).length },
                                ]}
                            />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {queue.length === 0 ? (
                                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                                    {entries.data.length === 0
                                        ? emptyMsg.title
                                        : 'Tidak ada entry dengan filter ini.'}
                                </p>
                            ) : (
                                queue.map((entry, i) => (
                                    <QueueRow
                                        key={entry.id}
                                        entry={entry}
                                        selected={i === selectedIndex}
                                        onSelect={() => setActiveIndex(i)}
                                    />
                                ))
                            )}
                        </div>
                        {entries.last_page > 1 && (
                            <div className="flex items-center justify-between gap-2 border-t-(length:--bw) px-4 py-2.5 text-xs text-muted-foreground">
                                <span className="tnum">
                                    {entries.from}–{entries.to} dari {entries.total}
                                </span>
                                <PageButtons
                                    currentPage={entries.current_page}
                                    lastPage={entries.last_page}
                                    onPageChange={(page) =>
                                        router.get('/p2h/approvals', { ...filters, page })
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <div className="min-h-0">
                        {selected ? (
                            <ApprovalDetailPanel
                                key={selected.id}
                                entry={selected}
                                approveRef={approveRef}
                                onReject={() => setRejectEntry(selected)}
                                onApproved={() => toast.success(`P2H ${selected.no_unit} disetujui`)}
                            />
                        ) : (
                            <div className="grid h-full place-items-center px-6 text-center">
                                <div>
                                    <p className="text-lg font-semibold">
                                        {activeStatus === 'pending' ? 'Antrean kosong' : emptyMsg.title}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {activeStatus === 'pending'
                                            ? 'Semua P2H sudah ditinjau.'
                                            : emptyMsg.desc}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="contents lg:hidden">
                {/* ── Status filter ── */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                        <StatusFilterTab
                            value="pending"
                            label="Menunggu"
                            icon={Clock}
                            active={activeStatus === 'pending'}
                            onClick={() => setStatus('pending')}
                        />
                        <StatusFilterTab
                            value="approved"
                            label="Disetujui"
                            icon={CheckCircle2}
                            active={activeStatus === 'approved'}
                            onClick={() => setStatus('approved')}
                        />
                        <StatusFilterTab
                            value="rejected"
                            label="Ditolak"
                            icon={XCircle}
                            active={activeStatus === 'rejected'}
                            onClick={() => setStatus('rejected')}
                        />
                    </div>
                    {entries.total > 0 && (
                        <p className="px-1 text-xs text-muted-foreground tabular-nums">
                            {entries.total} entri ditemukan
                        </p>
                    )}
                </div>

                {/* ── Content ── */}
                {entries.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
                        <div className="rounded-full bg-muted p-4">
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold">{emptyMsg.title}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {emptyMsg.desc}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {entries.data.map((entry, i) => (
                            <EntryCard
                                key={entry.id}
                                entry={entry}
                                onReview={openReview}
                                onReject={setRejectEntry}
                                active={i === activeIndex}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {entries.last_page > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            {entries.from}–{entries.to} dari{' '}
                            <span className="font-medium">{entries.total}</span>{' '}
                            entri
                        </p>
                        <PageButtons
                            currentPage={entries.current_page}
                            lastPage={entries.last_page}
                            onPageChange={(page) =>
                                router.get('/p2h/approvals', {
                                    ...filters,
                                    page,
                                })
                            }
                        />
                    </div>
                )}
                </div>
            </div>

            <ReviewApproveSheet
                entry={reviewEntry}
                open={reviewOpen}
                onClose={closeReview}
                onReject={openRejectFromReview}
            />

            <RejectDialog
                entry={rejectEntry}
                open={!!rejectEntry}
                onClose={() => setRejectEntry(null)}
            />

            {bulkApprovable !== null && (
                <BulkApproveDialog
                    open={bulkOpen}
                    onClose={() => setBulkOpen(false)}
                    approvable={bulkApprovable}
                    pending={stats.pending}
                />
            )}
        </>
    );
}

P2hApprovals.layout = {
    breadcrumbs: [
        { title: 'P2H', href: '/p2h' },
        { title: 'Persetujuan LV', href: '/p2h/approvals' },
    ],
};
