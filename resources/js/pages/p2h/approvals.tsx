import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    ClipboardCheck,
    ClipboardList,
    Clock,
    Gauge,
    Loader2,
    MapPin,
    PenLine,
    ShieldCheck,
    User,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

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
    stats: { pending: number; approved_today: number; rejected_today: number };
}

/* ─────────────────── Constants ─────────────────────────────── */
const SECTION_LABELS: Record<string, string> = {
    A: 'Seksi A — Pemeriksaan Luar Kabin',
    B: 'Seksi B — Pemeriksaan Dalam Kabin',
    C: 'Seksi C — Perlengkapan Tambahan',
};

/* ─────────────────── Status Badge ──────────────────────────── */
function ApprovalStatusBadge({ status }: { status: ApprovalStatus | null }) {
    if (!status) return null;
    const config = {
        pending:  { label: 'Menunggu',  icon: Clock,        cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
        approved: { label: 'Disetujui', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
        rejected: { label: 'Ditolak',   icon: XCircle,      cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
    };
    const { label, icon: Icon, cls } = config[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

/* ─────────────────── Stat Card ─────────────────────────────── */
function StatCard({
    value, label, icon: Icon, color,
}: {
    value: number; label: string; icon: React.ElementType; color: 'amber' | 'green' | 'red';
}) {
    const colors = {
        amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
        green: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
        red:   'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    };
    const iconColors = {
        amber: 'text-amber-600 dark:text-amber-400',
        green: 'text-emerald-600 dark:text-emerald-400',
        red:   'text-red-600 dark:text-red-400',
    };
    const valueColors = {
        amber: 'text-amber-700 dark:text-amber-300',
        green: 'text-emerald-700 dark:text-emerald-300',
        red:   'text-red-700 dark:text-red-300',
    };
    return (
        <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${colors[color]}`}>
            <div className={`rounded-lg p-2 bg-white/60 dark:bg-black/20 ${iconColors[color]}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className={`text-2xl font-bold tabular-nums ${valueColors[color]}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

/* ─────────────── Reject Dialog ─────────────────────────────── */
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
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                        <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <DialogTitle className="text-center">Tolak P2H?</DialogTitle>
                    <DialogDescription className="text-center">
                        P2H unit <strong>{entry?.no_unit}</strong> oleh <strong>{entry?.driver_name}</strong> akan ditolak.
                        Driver akan mendapat notifikasi untuk melakukan pengisian ulang.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        Catatan Penolakan <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Jelaskan alasan penolakan kepada driver..."
                        className="min-h-[90px] resize-none"
                        maxLength={500}
                    />
                    <p className="text-right text-xs text-muted-foreground">{catatan.length}/500</p>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>Batal</Button>
                    <Button variant="destructive" onClick={submit} disabled={!catatan.trim() || processing} className="flex-1">
                        {processing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Menolak…</> : 'Tolak P2H'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────── Review & Approve Sheet ───────────────────────── */
function ReviewApproveSheet({
    entry, open, onClose, onReject,
}: {
    entry: ApprovalEntry | null; open: boolean; onClose: () => void; onReject: () => void;
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
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((data) => { setDetail(data); setLoading(false); })
            .catch(() => { toast.error('Gagal memuat detail P2H. Coba lagi.'); setLoading(false); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry?.id]);

    const handleApprove = () => {
        if (!entry) return;
        if (sigEmpty || sigPadRef.current?.isEmpty()) {
            toast.error('Tanda tangan wajib dibuat sebelum menyetujui.');
            return;
        }
        const signature = sigPadRef.current?.toDataURL('image/png') ?? '';
        if (signature.length > 2 * 1024 * 1024) {
            toast.error('Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.');
            return;
        }
        setProcessing(true);
        router.patch(`/p2h/entries/${entry.id}/approve`, { signature }, {
            onFinish: () => { setProcessing(false); onClose(); },
        });
    };

    const groupedSections = detail ? Object.entries(detail.grouped_answers) : [];
    const hasCritical = entry?.has_critical;

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent side="bottom" className="flex h-[95vh] flex-col rounded-t-2xl p-0">
                {/* Header */}
                <SheetHeader className="shrink-0 border-b px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <SheetTitle className="text-base">Review P2H — {entry?.no_unit}</SheetTitle>
                            <p className="text-sm text-muted-foreground">
                                {entry?.driver_name} · {entry?.tanggal} · {entry?.shift ?? '-'}
                            </p>
                        </div>
                        {hasCritical && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
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
                                <div className={`rounded-xl border p-3 text-center ${detail.score < 80 ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
                                    <p className={`text-2xl font-bold ${detail.score < 80 ? 'text-red-600' : 'text-emerald-600'}`}>{detail.score}%</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Skor</p>
                                </div>
                                <div className={`rounded-xl border p-3 text-center ${detail.tl_count > 0 ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
                                    <p className={`text-2xl font-bold ${detail.tl_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{detail.tl_count}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Tidak Layak</p>
                                </div>
                                <div className={`rounded-xl border p-3 text-center ${detail.kondisi_akhir === 'BD' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
                                    <p className={`text-2xl font-bold ${detail.kondisi_akhir === 'BD' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {detail.kondisi_akhir === 'BD' ? 'BD' : 'OK'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Kondisi</p>
                                </div>
                            </div>

                            {/* Info umum */}
                            <div className="divide-y rounded-xl border bg-muted/30 text-sm">
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

                            {/* Justifikasi kondisi */}
                            {detail.justifikasi_kondisi && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                                    <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Justifikasi Kondisi Driver:</p>
                                    <p className="text-sm text-amber-800 dark:text-amber-200">{detail.justifikasi_kondisi}</p>
                                </div>
                            )}

                            {/* Tanda tangan driver */}
                            {detail.paraf_url && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanda Tangan Driver</p>
                                    <div className="flex justify-center rounded-xl border bg-white p-3">
                                        <img src={detail.paraf_url} alt="Tanda tangan driver" className="max-h-20 object-contain" />
                                    </div>
                                </div>
                            )}

                            {/* Checklist per seksi */}
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist Inspeksi</p>
                                {groupedSections.map(([section, items]) => {
                                    const tlItems = items.filter((i) => i.kondisi === 'Tidak Layak');
                                    const hasAA = tlItems.some((i) => i.kode_bahaya === 'AA');
                                    return (
                                        <div key={section} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">{SECTION_LABELS[section] ?? `Seksi ${section}`}</p>
                                                {hasAA && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <AlertCircle className="h-3 w-3" /> STOP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="divide-y overflow-hidden rounded-xl border">
                                                {items.map((item) => {
                                                    const isTL = item.kondisi === 'Tidak Layak';
                                                    return (
                                                        <div key={item.inspection_item_id}
                                                            className={`px-3 py-2.5 text-sm ${isTL ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex min-w-0 items-start gap-2">
                                                                    {item.kode_bahaya === 'AA' && isTL && (
                                                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                                                                    )}
                                                                    <span className={isTL ? 'font-medium text-red-800 dark:text-red-300' : 'text-foreground'}>
                                                                        {item.nama_item}
                                                                    </span>
                                                                </div>
                                                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                                                                    isTL
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                                }`}>
                                                                    {item.kondisi ?? '-'}
                                                                </span>
                                                            </div>
                                                            {isTL && item.keterangan && (
                                                                <p className="mt-1 pl-5 text-xs text-red-700 dark:text-red-400">
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
                            </div>

                            <Separator />

                            {/* Signature section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <PenLine className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-semibold">Tanda Tangan Persetujuan</p>
                                    <span className="text-destructive">*</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Dengan menandatangani, Anda menyatakan telah mereview dan menyetujui P2H ini.
                                </p>
                                <div className="overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-white dark:bg-zinc-900">
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
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="text-muted-foreground"
                                    onClick={() => { sigPadRef.current?.clear(); setSigEmpty(true); }}
                                >
                                    Hapus Tanda Tangan
                                </Button>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                    onClick={() => { onClose(); onReject(); }}
                                >
                                    <XCircle className="mr-1.5 h-4 w-4" />
                                    Tolak P2H
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={sigEmpty || processing}
                                    onClick={handleApprove}
                                >
                                    {processing
                                        ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Menyetujui…</>
                                        : <><ShieldCheck className="mr-1.5 h-4 w-4" />Setujui & Tanda Tangan</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

/* ──────────────── Entry Card ────────────────────────────────── */
function EntryCard({ entry, onReview }: { entry: ApprovalEntry; onReview: (e: ApprovalEntry) => void }) {
    return (
        <div className={`flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-sm ${
            entry.has_critical ? 'border-red-300 dark:border-red-800' : 'border-border'
        }`}>
            {/* Critical banner */}
            {entry.has_critical && (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Ada item Critical (AA) Tidak Layak — perlu perhatian khusus
                </div>
            )}

            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-base font-bold leading-tight">{entry.no_unit}</p>
                    <p className="text-xs text-muted-foreground">{entry.department}</p>
                </div>
                <ApprovalStatusBadge status={entry.approval_status} />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="truncate font-medium">{entry.driver_name}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.driver_jabatan}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Tanggal · Shift</p>
                    <p className="font-medium">{entry.tanggal}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.shift ?? '-'}</p>
                </div>
            </div>

            {/* Score + kondisi bar */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                <div className="flex-1 text-center">
                    <p className={`text-lg font-bold tabular-nums ${entry.score < 80 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {entry.score}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Skor</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex-1 text-center">
                    <p className={`text-lg font-bold tabular-nums ${entry.tl_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {entry.tl_count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">TL</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex-1 text-center">
                    <p className={`text-sm font-bold ${entry.kondisi_akhir === 'BD' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {entry.kondisi_akhir ?? '-'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Kondisi</p>
                </div>
            </div>

            {/* Rejection note */}
            {entry.approval_status === 'rejected' && entry.catatan_approval && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/20">
                    <p className="text-xs text-red-700 dark:text-red-400">
                        <span className="font-semibold">Catatan:</span> {entry.catatan_approval}
                    </p>
                </div>
            )}

            {/* Approver info */}
            {entry.approver_name && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 text-xs text-muted-foreground">
                        {entry.approval_status === 'approved' ? '✓ Disetujui' : '✕ Ditolak'} oleh{' '}
                        <span className="font-medium text-foreground">{entry.approver_name}</span>
                        {entry.approved_at && <> · {entry.approved_at}</>}
                    </div>
                    {entry.approver_signature_url && (
                        <div className="rounded-lg border bg-white p-1">
                            <img src={entry.approver_signature_url} alt="TTD" className="h-8 object-contain" />
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 border-t pt-3">
                <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/p2h/${entry.session_id}`}>Lihat Detail</Link>
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
    );
}

/* ──────────────────── Status Filter ────────────────────────── */
function StatusFilterTab({
    value, label, icon: Icon, active, onClick,
}: {
    value: string; label: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
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
export default function P2hApprovals({ entries, filters, canSeeAllDept, stats }: Props) {
    const [rejectEntry, setRejectEntry] = useState<ApprovalEntry | null>(null);
    const [reviewEntry, setReviewEntry] = useState<ApprovalEntry | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);

    const activeStatus = filters.status ?? 'pending';

    const openReview = (entry: ApprovalEntry) => { setReviewEntry(entry); setReviewOpen(true); };
    const closeReview = () => setReviewOpen(false);
    const openRejectFromReview = () => { setReviewOpen(false); setTimeout(() => setRejectEntry(reviewEntry), 150); };

    const setStatus = (s: string) => {
        router.get('/p2h/approvals', { status: s }, { preserveState: true, replace: true });
    };

    const emptyMessages = {
        pending: { title: 'Tidak ada P2H menunggu persetujuan', desc: 'Semua P2H LV sudah terverifikasi. ' },
        approved: { title: 'Belum ada P2H yang disetujui', desc: 'P2H yang disetujui akan muncul di sini.' },
        rejected: { title: 'Belum ada P2H yang ditolak', desc: 'P2H yang ditolak akan muncul di sini.' },
    };
    const emptyMsg = emptyMessages[activeStatus as keyof typeof emptyMessages] ?? emptyMessages.pending;

    return (
        <>
            <Head title="Persetujuan P2H LV" />

            <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Persetujuan P2H Unit LV</h1>
                            <p className="text-sm text-muted-foreground">
                                {canSeeAllDept
                                    ? 'Semua P2H Light Vehicle yang memerlukan verifikasi'
                                    : 'P2H LV yang menunjuk Anda sebagai PIC verifikasi'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Stats summary ── */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard value={stats.pending} label="Menunggu Persetujuan" icon={Clock} color="amber" />
                    <StatCard value={stats.approved_today} label="Disetujui Hari Ini" icon={CheckCircle2} color="green" />
                    <StatCard value={stats.rejected_today} label="Ditolak Hari Ini" icon={XCircle} color="red" />
                </div>

                {/* ── Status filter ── */}
                <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                    <StatusFilterTab value="pending" label="Menunggu" icon={Clock} active={activeStatus === 'pending'} onClick={() => setStatus('pending')} />
                    <StatusFilterTab value="approved" label="Disetujui" icon={CheckCircle2} active={activeStatus === 'approved'} onClick={() => setStatus('approved')} />
                    <StatusFilterTab value="rejected" label="Ditolak" icon={XCircle} active={activeStatus === 'rejected'} onClick={() => setStatus('rejected')} />
                    {entries.total > 0 && (
                        <span className="ml-auto pr-2 text-xs text-muted-foreground tabular-nums">
                            {entries.total} entri
                        </span>
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
                            <p className="mt-0.5 text-sm text-muted-foreground">{emptyMsg.desc}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {entries.data.map((entry) => (
                            <EntryCard key={entry.id} entry={entry} onReview={openReview} />
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {entries.last_page > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            {entries.from}–{entries.to} dari{' '}
                            <span className="font-medium">{entries.total}</span> entri
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline" size="sm"
                                disabled={entries.current_page === 1}
                                onClick={() => router.get('/p2h/approvals', { ...filters, page: entries.current_page - 1 })}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2 text-sm tabular-nums">{entries.current_page} / {entries.last_page}</span>
                            <Button
                                variant="outline" size="sm"
                                disabled={entries.current_page === entries.last_page}
                                onClick={() => router.get('/p2h/approvals', { ...filters, page: entries.current_page + 1 })}
                                className="h-8 w-8 p-0"
                            >
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
