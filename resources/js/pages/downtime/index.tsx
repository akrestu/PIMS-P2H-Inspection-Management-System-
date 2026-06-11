import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bus,
    Car,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Plus,
    Timer,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DowntimeLog {
    id: number;
    unit_id: number;
    no_unit: string;
    jenis_unit: string;
    tipe: 'BD' | 'PM' | 'Servis Berkala';
    jam_mulai: string;
    jam_selesai: string | null;
    duration_hours: number | null;
    keterangan: string | null;
    created_by: string | null;
}

interface PaginatedLogs {
    data: DowntimeLog[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface UnitOption {
    id: number;
    no_unit: string;
    jenis_unit: string;
}

interface Filters {
    unit_id?: string;
    tipe?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    [key: string]: string | undefined;
}

interface Props {
    logs: PaginatedLogs;
    allUnits: UnitOption[];
    filters: Filters;
    ongoingCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tipeConfig(tipe: DowntimeLog['tipe']) {
    switch (tipe) {
        case 'BD':
            return { label: 'Breakdown', badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' };
        case 'PM':
            return { label: 'Preventive Maintenance', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' };
        case 'Servis Berkala':
            return { label: 'Servis Berkala', badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' };
    }
}

function formatDuration(hours: number | null): string {
    if (hours === null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

function formatDatetime(dt: string | null): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Asia/Jakarta',
    });
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

interface DowntimeFormData {
    unit_id: string;
    tipe: string;
    jam_mulai: string;
    jam_selesai: string;
    keterangan: string;
    [key: string]: string;
}

function DowntimeDialog({
    open,
    onClose,
    allUnits,
    editLog,
    closeOnly,
}: {
    open: boolean;
    onClose: () => void;
    allUnits: UnitOption[];
    editLog?: DowntimeLog | null;
    closeOnly?: boolean;
}) {
    const isEdit = !!editLog;

    const { data, setData, post, patch, processing, errors, reset } = useForm<DowntimeFormData>({
        unit_id:     editLog ? String(editLog.unit_id) : '',
        tipe:        editLog?.tipe ?? '',
        jam_mulai:   editLog?.jam_mulai?.slice(0, 16) ?? '',
        jam_selesai: editLog?.jam_selesai?.slice(0, 16) ?? '',
        keterangan:  editLog?.keterangan ?? '',
    });

    useEffect(() => {
        setData({
            unit_id:     editLog ? String(editLog.unit_id) : '',
            tipe:        editLog?.tipe ?? '',
            jam_mulai:   editLog?.jam_mulai?.slice(0, 16) ?? '',
            jam_selesai: editLog?.jam_selesai?.slice(0, 16) ?? '',
            keterangan:  editLog?.keterangan ?? '',
        });
    }, [editLog]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            patch(`/downtime/${editLog!.id}`, {
                onSuccess: () => { reset(); onClose(); },
            });
        } else {
            post('/downtime', {
                onSuccess: () => { reset(); onClose(); },
            });
        }
    };

    const title = closeOnly
        ? 'Tutup Downtime'
        : isEdit
          ? 'Edit Downtime'
          : 'Catat Downtime Baru';

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-muted-foreground" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Unit */}
                    <div className="space-y-1.5">
                        <Label>Unit <span className="text-destructive">*</span></Label>
                        <Select
                            value={data.unit_id}
                            onValueChange={(v) => setData('unit_id', v)}
                            disabled={closeOnly}
                        >
                            <SelectTrigger><SelectValue placeholder="Pilih unit…" /></SelectTrigger>
                            <SelectContent>
                                {allUnits.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.no_unit} ({u.jenis_unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.unit_id && <p className="text-xs text-destructive">{errors.unit_id}</p>}
                    </div>

                    {/* Tipe */}
                    {!closeOnly && (
                        <div className="space-y-1.5">
                            <Label>Tipe Downtime <span className="text-destructive">*</span></Label>
                            <Select value={data.tipe} onValueChange={(v) => setData('tipe', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih tipe…" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BD">Breakdown (BD)</SelectItem>
                                    <SelectItem value="PM">Preventive Maintenance (PM)</SelectItem>
                                    <SelectItem value="Servis Berkala">Servis Berkala</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.tipe && <p className="text-xs text-destructive">{errors.tipe}</p>}
                        </div>
                    )}

                    {/* Jam Mulai */}
                    {!closeOnly && (
                        <div className="space-y-1.5">
                            <Label>Jam Mulai <span className="text-destructive">*</span></Label>
                            <Input
                                type="datetime-local"
                                value={data.jam_mulai}
                                onChange={(e) => setData('jam_mulai', e.target.value)}
                            />
                            {errors.jam_mulai && <p className="text-xs text-destructive">{errors.jam_mulai}</p>}
                        </div>
                    )}

                    {/* Jam Selesai */}
                    <div className="space-y-1.5">
                        <Label>
                            Jam Selesai
                            {closeOnly && <span className="text-destructive"> *</span>}
                            {!closeOnly && <span className="text-muted-foreground text-xs"> (kosongkan jika masih berlangsung)</span>}
                        </Label>
                        <Input
                            type="datetime-local"
                            value={data.jam_selesai}
                            onChange={(e) => setData('jam_selesai', e.target.value)}
                            min={data.jam_mulai}
                        />
                        {errors.jam_selesai && <p className="text-xs text-destructive">{errors.jam_selesai}</p>}
                    </div>

                    {/* Keterangan */}
                    <div className="space-y-1.5">
                        <Label>Keterangan</Label>
                        <Textarea
                            value={data.keterangan}
                            onChange={(e) => setData('keterangan', e.target.value)}
                            placeholder="Uraian singkat masalah atau pekerjaan yang dilakukan…"
                            className="min-h-[72px] text-sm"
                            maxLength={500}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan…' : closeOnly ? 'Tutup Downtime' : isEdit ? 'Simpan Perubahan' : 'Catat Downtime'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteDialog({ open, onClose, log }: { open: boolean; onClose: () => void; log: DowntimeLog | null }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!log) return;
        setDeleting(true);
        router.delete(`/downtime/${log.id}`, {
            onFinish: () => { setDeleting(false); onClose(); },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" /> Hapus Log Downtime
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Hapus log downtime unit <strong>{log?.no_unit}</strong>?
                    Data tidak dapat dikembalikan setelah dihapus.
                </p>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Menghapus…' : 'Hapus'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DowntimeIndex({ logs, allUnits, filters, ongoingCount }: Props) {
    const [form, setForm] = useState<Filters>(filters);
    const [showFilter, setShowFilter] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editLog, setEditLog] = useState<DowntimeLog | null>(null);
    const [closeOnlyLog, setCloseOnlyLog] = useState<DowntimeLog | null>(null);
    const [deleteLog, setDeleteLog] = useState<DowntimeLog | null>(null);

    const handleFilter = () => {
        router.get('/downtime', form, { preserveState: true });
    };

    const handleReset = () => {
        setForm({});
        router.get('/downtime', {});
    };

    const goToPage = (page: number) => {
        router.get('/downtime', { ...filters, page }, { preserveState: true });
    };

    return (
        <>
            <Head title="Downtime Log" />
            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold md:text-2xl flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-primary" />
                            Downtime Log
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Catat dan pantau waktu downtime unit · PA = W / (W + S)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilter ? 'default' : 'outline'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            <Filter className="h-4 w-4" /> Filter
                        </Button>
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => { setEditLog(null); setDialogOpen(true); }}
                        >
                            <Plus className="h-4 w-4" /> Catat Downtime
                        </Button>
                    </div>
                </div>

                {/* ── Ongoing Alert ── */}
                {ongoingCount > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/20">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                            <strong>{ongoingCount} unit</strong> sedang dalam kondisi downtime (belum ditutup).
                            Segera tutup setelah perbaikan selesai.
                        </p>
                    </div>
                )}

                {/* ── Filter Panel ── */}
                {showFilter && (
                    <Card className="border-primary/20">
                        <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Filter className="h-4 w-4" /> Filter Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
                                    <Input type="date" value={form.date_from ?? ''} onChange={(e) => setForm({ ...form, date_from: e.target.value })} className="h-10" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
                                    <Input type="date" value={form.date_to ?? ''} onChange={(e) => setForm({ ...form, date_to: e.target.value })} className="h-10" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Unit</Label>
                                    <Select value={form.unit_id ?? 'all'} onValueChange={(v) => setForm({ ...form, unit_id: v === 'all' ? undefined : v })}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Semua unit" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua unit</SelectItem>
                                            {allUnits.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.no_unit}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                    <Select value={form.status ?? 'all'} onValueChange={(v) => setForm({ ...form, status: v === 'all' ? undefined : v })}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Semua status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua</SelectItem>
                                            <SelectItem value="ongoing">Sedang BD (Ongoing)</SelectItem>
                                            <SelectItem value="completed">Selesai</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                                    <X className="h-4 w-4" /> Reset
                                </Button>
                                <Button size="sm" onClick={handleFilter}>Terapkan</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Table ── */}
                <Card>
                    <CardContent className="p-0">
                        {logs.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <Wrench className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold">Tidak ada log downtime</p>
                                    <p className="text-sm text-muted-foreground">Catat ketika unit mengalami BD atau maintenance.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam Mulai</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam Selesai</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Keterangan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dicatat oleh</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.data.map((log) => {
                                            const tipe = tipeConfig(log.tipe);
                                            const isOngoing = !log.jam_selesai;
                                            const isLV = log.jenis_unit === 'Light Vehicle';

                                            return (
                                                <tr key={log.id} className={cn('hover:bg-muted/20 transition-colors', isOngoing && 'bg-red-50/40 dark:bg-red-950/10')}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', isLV ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-purple-100 dark:bg-purple-950/40')}>
                                                                {isLV
                                                                    ? <Car className="h-3.5 w-3.5 text-blue-600" />
                                                                    : <Bus className="h-3.5 w-3.5 text-purple-600" />
                                                                }
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold">{log.no_unit}</p>
                                                                <p className="text-xs text-muted-foreground">{log.jenis_unit}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={cn('text-xs', tipe.badgeClass)}>
                                                            {tipe.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            {formatDatetime(log.jam_mulai)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {isOngoing ? (
                                                            <Badge variant="outline" className="gap-1 text-xs border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                                                                <Timer className="h-3 w-3 animate-pulse" />
                                                                Sedang BD
                                                            </Badge>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                {formatDatetime(log.jam_selesai)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {isOngoing ? (
                                                            <span className="text-muted-foreground">—</span>
                                                        ) : (
                                                            <span className={cn(log.duration_hours && log.duration_hours > 8 ? 'text-red-600 dark:text-red-400' : '')}>
                                                                {formatDuration(log.duration_hours)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 max-w-[200px]">
                                                        <p className="truncate text-xs text-muted-foreground">{log.keterangan || '—'}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.created_by ?? '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isOngoing && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 gap-1 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                                                                    onClick={() => { setCloseOnlyLog(log); setDialogOpen(true); }}
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    Tutup
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-2.5 text-xs"
                                                                onClick={() => { setEditLog(log); setCloseOnlyLog(null); setDialogOpen(true); }}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeleteLog(log)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Pagination ── */}
                {logs.last_page > 1 && (
                    <>
                        <Separator />
                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                            <p className="text-xs text-muted-foreground">
                                Menampilkan {logs.from}–{logs.to} dari {logs.total} log
                            </p>
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" disabled={logs.current_page === 1} onClick={() => goToPage(logs.current_page - 1)} className="h-8 w-8 p-0">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: Math.min(logs.last_page, 7) }, (_, i) => i + 1).map((p) => (
                                    <Button key={p} size="sm" variant={p === logs.current_page ? 'default' : 'outline'} onClick={() => goToPage(p)} className="h-8 w-8 p-0 text-xs">
                                        {p}
                                    </Button>
                                ))}
                                <Button size="sm" variant="outline" disabled={logs.current_page === logs.last_page} onClick={() => goToPage(logs.current_page + 1)} className="h-8 w-8 p-0">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Info Footer ── */}
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                    <p>
                        <strong className="text-foreground">S (Service Hours)</strong> = total jam di sini.{' '}
                        <strong className="text-foreground">W (Working Hours)</strong> = jumlah shift P2H × 12 jam.{' '}
                        <strong className="text-foreground">PA = W / (W + S) × 100%</strong>. Lihat hasil di halaman Monitoring PA.
                    </p>
                </div>
            </div>

            {/* ── Dialogs ── */}
            <DowntimeDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditLog(null); setCloseOnlyLog(null); }}
                allUnits={allUnits}
                editLog={closeOnlyLog ?? editLog}
                closeOnly={!!closeOnlyLog}
            />
            <DeleteDialog
                open={!!deleteLog}
                onClose={() => setDeleteLog(null)}
                log={deleteLog}
            />
        </>
    );
}

DowntimeIndex.layout = {
    breadcrumbs: [{ title: 'Downtime Log', href: '/downtime' }],
};
