import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { ApprovalStatus } from '@/types/pims';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Gauge,
    Loader2,
    MapPin,
    PenLine,
    User,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

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
}

const SECTION_LABELS: Record<string, string> = {
    A: 'Seksi A — Pemeriksaan Luar Kabin',
    B: 'Seksi B — Pemeriksaan Dalam Kabin',
    C: 'Seksi C — Perlengkapan Tambahan',
};

function ApprovalStatusBadge({ status }: { status: ApprovalStatus | null }) {
    if (!status) return null;
    const config = {
        pending:  { label: 'Menunggu',  icon: Clock,        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
        approved: { label: 'Disetujui', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        rejected: { label: 'Ditolak',   icon: XCircle,      cls: 'bg-red-100 text-red-700 border-red-200' },
    };
    const { label, icon: Icon, cls } = config[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

// ─── Reject Dialog ────────────────────────────────────────────────────────────
function RejectDialog({ entry, open, onClose }: { entry: ApprovalEntry | null; open: boolean; onClose: () => void }) {
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        if (!entry || !catatan.trim()) return;
        setProcessing(true);
        router.patch(`/p2h/entries/${entry.id}/reject`, { catatan }, {
            onFinish: () => { setProcessing(false); onClose(); setCatatan(''); },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <DialogTitle className="text-center">Tolak P2H?</DialogTitle>
                    <DialogDescription className="text-center">
                        P2H <strong>{entry?.no_unit}</strong> oleh <strong>{entry?.driver_name}</strong> akan ditolak.
                        Driver akan mendapat notifikasi untuk melakukan pengisian ulang.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Catatan Penolakan <span className="text-destructive">*</span></Label>
                    <Textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Jelaskan alasan penolakan..."
                        className="min-h-[80px] resize-none"
                        maxLength={500}
                    />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
                    <Button variant="destructive" onClick={submit} disabled={!catatan.trim() || processing} className="flex-1">
                        {processing ? 'Menolak...' : 'Tolak P2H'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Review & Approve Sheet ───────────────────────────────────────────────────
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
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);

    useEffect(() => {
        if (!open || !entry) return;
        if (detail?.id === entry.id) return;
        setLoading(true);
        setDetail(null);
        setSigEmpty(true);
        fetch(`/p2h/entries/${entry.id}/detail`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => { setDetail(data); setLoading(false); })
            .catch(() => {
                toast.error('Gagal memuat detail P2H. Coba lagi.');
                setLoading(false);
                onClose();
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry?.id]);

    const handleOpenChange = (o: boolean) => {
        if (!o) onClose();
    };

    const handleApprove = () => {
        if (!entry) return;
        if (sigEmpty || sigPadRef.current?.isEmpty()) {
            toast.error('Tanda tangan wajib dibuat sebelum menyetujui.');
            return;
        }

        const signature = sigPadRef.current?.toDataURL('image/png') ?? '';
        const MAX_SIG_BYTES = 2 * 1024 * 1024;
        if (signature.length > MAX_SIG_BYTES) {
            toast.error('Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.');
            return;
        }

        setProcessing(true);
        router.patch(`/p2h/entries/${entry.id}/approve`, { signature }, {
            onFinish: () => { setProcessing(false); onClose(); },
        });
    };

    const groupedSections = detail ? Object.entries(detail.grouped_answers) : [];

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl p-0 flex flex-col">
                <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
                    <SheetTitle className="text-base">Review P2H — {entry?.no_unit}</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                        {entry?.driver_name} · {entry?.tanggal} · {entry?.shift ?? '-'}
                    </p>
                </SheetHeader>

                {loading && (
                    <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Memuat detail P2H…
                    </div>
                )}

                {!loading && detail && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex flex-col gap-4 p-4 pb-2">

                            {/* Info umum */}
                            <div className="rounded-xl border bg-muted/30 divide-y text-sm">
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 text-muted-foreground">Driver</span>
                                    <span className="font-medium">{detail.driver_name}</span>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 text-muted-foreground">Unit</span>
                                    <span className="font-medium">{detail.no_unit} · {detail.jenis_unit}</span>
                                </div>
                                {detail.lokasi_kerja && (
                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 text-muted-foreground">Lokasi Kerja</span>
                                        <span className="font-medium">{detail.lokasi_kerja}</span>
                                    </div>
                                )}
                                {detail.km_awal != null && (
                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                        <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 text-muted-foreground">HM/KM Awal</span>
                                        <span className="font-medium">{detail.km_awal.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Skor & kondisi */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                                    <p className={`text-2xl font-bold ${detail.score < 80 ? 'text-red-600' : 'text-emerald-600'}`}>{detail.score}%</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Skor</p>
                                </div>
                                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                                    <p className={`text-2xl font-bold ${detail.tl_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{detail.tl_count}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tidak Layak</p>
                                </div>
                                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                                    <p className={`text-2xl font-bold ${detail.kondisi_akhir === 'BD' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {detail.kondisi_akhir === 'BD' ? 'BD' : 'OK'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Kondisi</p>
                                </div>
                            </div>

                            {detail.justifikasi_kondisi && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Justifikasi Kondisi Driver:</p>
                                    <p className="text-sm text-amber-800 dark:text-amber-200">{detail.justifikasi_kondisi}</p>
                                </div>
                            )}

                            {/* Tanda tangan driver */}
                            {detail.paraf_url && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tanda Tangan Driver</p>
                                    <div className="rounded-xl border bg-white p-3 flex justify-center">
                                        <img src={detail.paraf_url} alt="Tanda tangan driver" className="max-h-20 object-contain" />
                                    </div>
                                </div>
                            )}

                            {/* Checklist per seksi */}
                            {groupedSections.map(([section, items]) => {
                                const tlItems = items.filter((i) => i.kondisi === 'Tidak Layak');
                                const hasAA = tlItems.some((i) => i.kode_bahaya === 'AA');
                                return (
                                    <div key={section} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">{SECTION_LABELS[section] ?? `Seksi ${section}`}</p>
                                            {hasAA && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                                    <AlertCircle className="h-3 w-3" /> STOP
                                                </span>
                                            )}
                                        </div>
                                        <div className="rounded-xl border divide-y overflow-hidden">
                                            {items.map((item) => {
                                                const isTL = item.kondisi === 'Tidak Layak';
                                                return (
                                                    <div key={item.inspection_item_id}
                                                        className={`px-3 py-2.5 text-sm ${isTL ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-start gap-2 min-w-0">
                                                                {item.kode_bahaya === 'AA' && isTL && (
                                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" />
                                                                )}
                                                                <span className={`${isTL ? 'font-medium text-red-800 dark:text-red-300' : 'text-foreground'}`}>
                                                                    {item.nama_item}
                                                                </span>
                                                            </div>
                                                            <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                                isTL
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                            }`}>
                                                                {item.kondisi ?? '-'}
                                                            </span>
                                                        </div>
                                                        {isTL && item.keterangan && (
                                                            <p className="mt-1 text-xs text-red-700 dark:text-red-400 pl-5">
                                                                Ket: {item.keterangan}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            <Separator />

                            {/* Tanda tangan approver */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <PenLine className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-semibold">Tanda Tangan Persetujuan</p>
                                    <span className="text-destructive text-sm">*</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Dengan menandatangani, Anda menyatakan telah mereview form P2H ini dan menyetujui hasilnya.
                                </p>

                                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-white dark:bg-zinc-900 overflow-hidden">
                                    <ReactSignatureCanvas
                                        ref={sigPadRef}
                                        penColor="#1d4ed8"
                                        canvasProps={{
                                            className: 'w-full',
                                            style: { height: 160, touchAction: 'none' },
                                        }}
                                        onEnd={() => setSigEmpty(false)}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-muted-foreground"
                                        onClick={() => { sigPadRef.current?.clear(); setSigEmpty(true); }}
                                    >
                                        Hapus TTD
                                    </Button>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pb-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => { onClose(); onReject(); }}
                                >
                                    <XCircle className="h-4 w-4 mr-1.5" />
                                    Tolak P2H
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={sigEmpty || processing}
                                    onClick={handleApprove}
                                >
                                    {processing ? (
                                        <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Menyetujui…</>
                                    ) : (
                                        <><CheckCircle2 className="h-4 w-4 mr-1.5" />Setujui & TTD</>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function P2hApprovals({ entries, filters, canSeeAllDept }: Props) {
    const [rejectEntry, setRejectEntry] = useState<ApprovalEntry | null>(null);
    const [reviewEntry, setReviewEntry] = useState<ApprovalEntry | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);

    const activeStatus = filters.status ?? 'pending';

    const openReview = (entry: ApprovalEntry) => {
        setReviewEntry(entry);
        setReviewOpen(true);
    };

    const closeReview = () => setReviewOpen(false);

    const openRejectFromReview = () => {
        setReviewOpen(false);
        setTimeout(() => setRejectEntry(reviewEntry), 150);
    };

    const setStatus = (s: string) => {
        router.get('/p2h/approvals', { status: s }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Persetujuan P2H LV" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Persetujuan P2H Unit LV</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                        {canSeeAllDept
                            ? 'Semua P2H LV yang memerlukan verifikasi.'
                            : 'P2H LV yang menunjuk Anda sebagai PIC verifikasi.'}
                    </p>
                </div>

                {/* Status filter tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {(['pending', 'approved', 'rejected'] as const).map((s) => {
                        const config = {
                            pending:  { label: 'Menunggu',  icon: Clock },
                            approved: { label: 'Disetujui', icon: CheckCircle2 },
                            rejected: { label: 'Ditolak',   icon: XCircle },
                        };
                        const { label, icon: Icon } = config[s];
                        return (
                            <button key={s} onClick={() => setStatus(s)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                                    activeStatus === s
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border hover:border-primary/50'
                                }`}>
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Empty state */}
                {entries.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
                        <div className="rounded-full bg-muted p-4">
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium">
                                {activeStatus === 'pending'
                                    ? 'Tidak ada P2H menunggu persetujuan'
                                    : activeStatus === 'approved'
                                    ? 'Belum ada P2H yang disetujui'
                                    : 'Belum ada P2H yang ditolak'}
                            </p>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                {activeStatus === 'pending' ? 'Semua P2H LV sudah terverifikasi.' : 'Belum ada data di kategori ini.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.data.map((entry) => (
                        <Card key={entry.id} className={`overflow-hidden transition-shadow hover:shadow-md ${
                            entry.has_critical ? 'border-red-300 dark:border-red-800' : ''
                        }`}>
                            {/* Critical banner */}
                            {entry.has_critical && (
                                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-400">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Ada item Critical (AA) Tidak Layak
                                </div>
                            )}

                            <CardContent className="p-4 space-y-3">
                                {/* Unit + status */}
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-base leading-tight">{entry.no_unit}</p>
                                        <p className="text-muted-foreground text-xs">{entry.department}</p>
                                    </div>
                                    <ApprovalStatusBadge status={entry.approval_status} />
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs">Driver</p>
                                        <p className="font-medium truncate">{entry.driver_name}</p>
                                        <p className="text-muted-foreground text-[10px]">{entry.driver_jabatan}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Tanggal</p>
                                        <p className="font-medium">{entry.tanggal}</p>
                                        <p className="text-muted-foreground text-[10px]">{entry.shift ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Skor Checklist</p>
                                        <p className={`font-medium ${entry.score < 80 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {entry.score}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Item TL</p>
                                        <p className={`font-medium ${entry.tl_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                            {entry.tl_count} item
                                        </p>
                                    </div>
                                </div>

                                {/* Kondisi akhir */}
                                {entry.kondisi_akhir && (
                                    <Badge variant={entry.kondisi_akhir === 'BD' ? 'destructive' : 'default'} className="text-xs">
                                        Kondisi: {entry.kondisi_akhir}
                                    </Badge>
                                )}

                                {/* Rejection note */}
                                {entry.approval_status === 'rejected' && entry.catatan_approval && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-2.5">
                                        <p className="text-xs text-red-700 dark:text-red-400">
                                            <span className="font-semibold">Catatan:</span> {entry.catatan_approval}
                                        </p>
                                    </div>
                                )}

                                {/* Approver info + TTD thumbnail */}
                                {entry.approver_name && (
                                    <div className="space-y-1.5">
                                        <p className="text-muted-foreground text-xs">
                                            {entry.approval_status === 'approved' ? '✓ Disetujui' : '✕ Ditolak'} oleh{' '}
                                            <span className="font-medium">{entry.approver_name}</span>
                                            {entry.approved_at && <> · {entry.approved_at}</>}
                                        </p>
                                        {entry.approver_signature_url && (
                                            <div className="rounded-lg border bg-white p-1.5 inline-block">
                                                <img
                                                    src={entry.approver_signature_url}
                                                    alt="TTD Approver"
                                                    className="h-10 object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1">
                                    <Button variant="outline" size="sm" asChild className="flex-1">
                                        <Link href={`/p2h/${entry.session_id}`}>Detail</Link>
                                    </Button>
                                    {entry.approval_status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-primary text-primary-foreground"
                                            onClick={() => openReview(entry)}
                                        >
                                            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                            Review & TTD
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                {entries.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            {entries.from}–{entries.to} dari {entries.total}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" disabled={entries.current_page === 1}
                                onClick={() => router.get('/p2h/approvals', { ...filters, page: entries.current_page - 1 })}
                                className="h-8 w-8 p-0">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2 text-sm">{entries.current_page} / {entries.last_page}</span>
                            <Button variant="outline" size="sm" disabled={entries.current_page === entries.last_page}
                                onClick={() => router.get('/p2h/approvals', { ...filters, page: entries.current_page + 1 })}
                                className="h-8 w-8 p-0">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
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
        </>
    );
}

P2hApprovals.layout = {
    breadcrumbs: [
        { title: 'P2H', href: '/p2h' },
        { title: 'Persetujuan LV', href: '/p2h/approvals' },
    ],
};
