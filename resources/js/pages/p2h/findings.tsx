import { Head, router, useForm, useHttp } from '@inertiajs/react';
import {
    AlarmClock,
    AlertTriangle,
    ChevronRight,
    Pencil,
    Repeat,
    Search,
    Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    suggest,
    update,
} from '@/actions/App/Http/Controllers/P2hFindingController';
import InputError from '@/components/input-error';
import { PageButtons } from '@/components/pagination-bar';
import { FilterChips } from '@/components/pims/filter-chips';
import { KpiCard, KpiStrip } from '@/components/pims/kpi';
import { PageHeader } from '@/components/pims/page-header';
import type { StatusKey } from '@/components/pims/status-pill';
import { KritisTag, StatusPill } from '@/components/pims/status-pill';
import { SortableHead } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { useRowSelection } from '@/hooks/use-row-selection';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'open' | 'progress' | 'closed';

interface Finding {
    id: number;
    tanggal_temuan: string;
    no_unit: string | null;
    jenis_unit: string | null;
    item_nama: string | null;
    kode_bahaya: string | null;
    keterangan: string | null;
    tindakan_perbaikan: string | null;
    pic_user_id: number | null;
    pic_name: string | null;
    target_selesai: string | null;
    status: Status;
    overdue: boolean;
    berulang: number | null;
    closed_at: string | null;
    closed_by: string | null;
    catatan_penutupan: string | null;
    foto_url: string | null;
    jumlah_laporan: number;
    terakhir_dilaporkan: string | null;
    keputusan_unit: 'Layak Pakai' | 'BD' | null;
    alasan_keputusan: string | null;
}

interface Props {
    findings: {
        data: Finding[];
        current_page: number;
        last_page: number;
        total: number;
    };
    counts: {
        open: number;
        progress: number;
        overdue: number;
        critical: number;
        due_today: number;
        closed: number;
        all: number;
        avg_age_days: number | null;
    };
    picOptions: { id: number; name: string }[];
    sites: { id: number; name: string }[];
    filters: { status: string; site_id: number | null; search: string | null };
    aiEnabled: boolean;
    canManage: boolean;
    recurringWindowDays: number;
}

interface FindingForm {
    tindakan_perbaikan: string;
    pic_user_id: number | null;
    target_selesai: string;
    status: Status;
    catatan_penutupan: string;
    foto_penutupan: File | null;
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
    open: {
        label: 'Open',
        className: 'bg-info-soft text-info border-info/40',
    },
    progress: {
        label: 'On Progress',
        className: 'bg-warning-soft text-warning border-warning/40',
    },
    closed: {
        label: 'Closed',
        className: 'bg-success-soft text-success border-success/40',
    },
};

/** Status temuan → StatusPill (Open = info, On Progress = warning, Closed = success). */
function FindingStatusPill({ status }: { status: Status }) {
    const key: Record<Status, StatusKey> = {
        open: 'open',
        progress: 'menunggu',
        closed: 'closed',
    };

    return (
        <StatusPill status={key[status]} label={STATUS_CONFIG[status].label} />
    );
}

function formatDate(date: string | null): string {
    if (!date) {
        return '—';
    }

    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function FindingFlags({
    overdue,
    berulang,
    windowDays = 30,
}: {
    overdue: boolean;
    berulang: number | null;
    windowDays?: number;
}) {
    if (!overdue && !berulang) {
        return null;
    }

    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {overdue && (
                <Badge
                    variant="outline"
                    className="gap-1 border-danger/40 text-danger"
                >
                    <AlarmClock className="h-3 w-3" /> Lewat target
                </Badge>
            )}
            {berulang && (
                <Badge
                    variant="outline"
                    className="gap-1 border-info/40 text-info"
                >
                    <Repeat className="h-3 w-3" /> Berulang {berulang}x/
                    {windowDays} hari
                </Badge>
            )}
        </div>
    );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function FindingDialog({
    finding,
    picOptions,
    aiEnabled,
    canManage,
    onClose,
}: {
    finding: Finding | null;
    picOptions: Props['picOptions'];
    aiEnabled: boolean;
    canManage: boolean;
    onClose: () => void;
}) {
    const form = useForm<FindingForm>({
        tindakan_perbaikan: '',
        pic_user_id: null,
        target_selesai: '',
        status: 'open',
        catatan_penutupan: '',
        foto_penutupan: null,
    });
    const { setData, clearErrors } = form;
    const ai = useHttp<Record<string, never>, { suggestion: string }>({});

    useEffect(() => {
        if (finding) {
            setData({
                tindakan_perbaikan: finding.tindakan_perbaikan ?? '',
                pic_user_id: finding.pic_user_id,
                target_selesai: finding.target_selesai ?? '',
                status: finding.status,
                catatan_penutupan: finding.catatan_penutupan ?? '',
                foto_penutupan: null,
            });
            clearErrors();
        }
    }, [finding, setData, clearErrors]);

    // Foto baru wajib setiap kali temuan ditutup (sama dengan UpdateP2hFindingRequest)
    const needsPhoto =
        form.data.status === 'closed' && finding?.status !== 'closed';

    const askAi = async () => {
        if (!finding) {
            return;
        }

        try {
            const res = await ai.submit(suggest(finding.id));
            form.setData('tindakan_perbaikan', res.suggestion);
            toast.success('Saran tindakan dari AI', {
                description: 'Periksa dan sesuaikan sebelum disimpan.',
            });
        } catch {
            toast.error('Saran AI tidak tersedia', {
                description: 'Coba lagi beberapa saat.',
            });
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!finding) {
            return;
        }

        // Upload file lewat POST + _method (multipart tidak didukung pada PATCH murni)
        form.transform((data) => ({
            ...data,
            target_selesai: data.target_selesai || null,
            _method: 'patch',
        }));
        form.post(update.url(finding.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open={!!finding} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Tindak Lanjut Temuan</DialogTitle>
                    <DialogDescription>
                        {finding?.no_unit} · {finding?.item_nama}
                        {finding?.keterangan && ` — ${finding.keterangan}`}
                    </DialogDescription>
                    {finding && (
                        <FindingFlags
                            overdue={finding.overdue}
                            berulang={finding.berulang}
                        />
                    )}
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="tindakan">Tindakan perbaikan</Label>
                            {aiEnabled && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 text-xs"
                                    disabled={ai.processing}
                                    onClick={askAi}
                                >
                                    <Sparkles
                                        className={cn(
                                            'h-3.5 w-3.5',
                                            ai.processing && 'animate-pulse',
                                        )}
                                    />
                                    {ai.processing
                                        ? 'Meminta saran...'
                                        : 'Saran AI'}
                                </Button>
                            )}
                        </div>
                        <Textarea
                            id="tindakan"
                            value={form.data.tindakan_perbaikan}
                            onChange={(e) =>
                                form.setData(
                                    'tindakan_perbaikan',
                                    e.target.value,
                                )
                            }
                            placeholder="Contoh: Ganti kampas rem depan di workshop"
                        />
                        <InputError message={form.errors.tindakan_perbaikan} />
                    </div>
                    {!canManage && finding && (
                        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                            PIC: <b>{finding.pic_name ?? '—'}</b> · Target:{' '}
                            <b>{formatDate(finding.target_selesai)}</b>
                            <br />
                            PIC & target diatur oleh admin/manager.
                        </p>
                    )}
                    <div
                        className={cn(
                            'grid gap-4 sm:grid-cols-2',
                            !canManage && 'hidden',
                        )}
                    >
                        <div className="space-y-1.5">
                            <Label>PIC</Label>
                            <Select
                                value={
                                    form.data.pic_user_id
                                        ? String(form.data.pic_user_id)
                                        : 'none'
                                }
                                onValueChange={(v) =>
                                    form.setData(
                                        'pic_user_id',
                                        v === 'none' ? null : Number(v),
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih PIC" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        — Belum ditunjuk —
                                    </SelectItem>
                                    {picOptions.map((u) => (
                                        <SelectItem
                                            key={u.id}
                                            value={String(u.id)}
                                        >
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.pic_user_id} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="target">Target selesai</Label>
                            <Input
                                id="target"
                                type="date"
                                value={form.data.target_selesai}
                                onChange={(e) =>
                                    form.setData(
                                        'target_selesai',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.target_selesai} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select
                            value={form.data.status}
                            onValueChange={(v) =>
                                form.setData('status', v as Status)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(STATUS_CONFIG) as Status[]).map(
                                    (s) => (
                                        <SelectItem key={s} value={s}>
                                            {STATUS_CONFIG[s].label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.status} />
                    </div>
                    {form.data.status === 'closed' && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="catatan">
                                    Catatan penutupan
                                </Label>
                                <Textarea
                                    id="catatan"
                                    value={form.data.catatan_penutupan}
                                    onChange={(e) =>
                                        form.setData(
                                            'catatan_penutupan',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Hasil perbaikan / verifikasi"
                                />
                                <InputError
                                    message={form.errors.catatan_penutupan}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="foto">
                                    Foto bukti perbaikan
                                    {needsPhoto && (
                                        <span className="text-destructive">
                                            {' '}
                                            *
                                        </span>
                                    )}
                                </Label>
                                {finding?.foto_url && (
                                    <a
                                        href={finding.foto_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                    >
                                        <img
                                            src={finding.foto_url}
                                            alt="Foto bukti perbaikan"
                                            className="h-32 w-full rounded-md border object-cover"
                                        />
                                    </a>
                                )}
                                <Input
                                    id="foto"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) =>
                                        form.setData(
                                            'foto_penutupan',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    {needsPhoto
                                        ? 'Wajib foto baru untuk menutup temuan. Maks 5 MB.'
                                        : finding?.foto_url
                                          ? 'Unggah foto baru untuk mengganti.'
                                          : 'Maks 5 MB.'}
                                </p>
                                <InputError
                                    message={form.errors.foto_penutupan}
                                />
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Update massal ─────────────────────────────────────────────────────────────

const KEEP = 'keep';

interface BatchForm {
    ids: number[];
    status: Status | '';
    pic_user_id: number | null;
    target_selesai: string;
    tindakan_perbaikan: string;
    catatan_penutupan: string;
    foto_penutupan: File | null;
}

function BatchFindingDialog({
    findings,
    picOptions,
    open,
    onClose,
    onDone,
}: {
    findings: Finding[];
    picOptions: Props['picOptions'];
    open: boolean;
    onClose: () => void;
    onDone: () => void;
}) {
    const form = useForm<BatchForm>({
        ids: [],
        status: '',
        pic_user_id: null,
        target_selesai: '',
        tindakan_perbaikan: '',
        catatan_penutupan: '',
        foto_penutupan: null,
    });
    const { setData, clearErrors, reset } = form;

    useEffect(() => {
        if (open) {
            reset();
            setData(
                'ids',
                findings.map((f) => f.id),
            );
            clearErrors();
        }
    }, [open, findings, reset, setData, clearErrors]);

    const closing = form.data.status === 'closed';
    const needsPhoto = closing && findings.some((f) => f.status !== 'closed');
    const units = [...new Set(findings.map((f) => f.no_unit))].join(', ');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // Field kosong = tidak diubah, tidak dikirim
        form.transform((data) =>
            Object.fromEntries(
                Object.entries(data).filter(([, v]) => v !== '' && v !== null),
            ),
        );
        form.post('/p2h/findings/batch', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                onDone();
                onClose();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Update {findings.length} Temuan Sekaligus
                    </DialogTitle>
                    <DialogDescription>
                        Unit: {units}. Field yang dibiarkan kosong atau
                        &quot;Tidak diubah&quot; tidak akan mengubah temuan.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select
                            value={form.data.status || KEEP}
                            onValueChange={(v) =>
                                form.setData(
                                    'status',
                                    v === KEEP ? '' : (v as Status),
                                )
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={KEEP}>
                                    — Tidak diubah —
                                </SelectItem>
                                {(Object.keys(STATUS_CONFIG) as Status[]).map(
                                    (s) => (
                                        <SelectItem key={s} value={s}>
                                            {STATUS_CONFIG[s].label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.status} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>PIC</Label>
                            <Select
                                value={
                                    form.data.pic_user_id
                                        ? String(form.data.pic_user_id)
                                        : KEEP
                                }
                                onValueChange={(v) =>
                                    form.setData(
                                        'pic_user_id',
                                        v === KEEP ? null : Number(v),
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={KEEP}>
                                        — Tidak diubah —
                                    </SelectItem>
                                    {picOptions.map((u) => (
                                        <SelectItem
                                            key={u.id}
                                            value={String(u.id)}
                                        >
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.pic_user_id} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="batch-target">Target selesai</Label>
                            <Input
                                id="batch-target"
                                type="date"
                                value={form.data.target_selesai}
                                onChange={(e) =>
                                    form.setData(
                                        'target_selesai',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.target_selesai} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="batch-tindakan">
                            Tindakan perbaikan
                        </Label>
                        <Textarea
                            id="batch-tindakan"
                            value={form.data.tindakan_perbaikan}
                            onChange={(e) =>
                                form.setData(
                                    'tindakan_perbaikan',
                                    e.target.value,
                                )
                            }
                            placeholder="Kosongkan bila tidak diubah"
                        />
                        <InputError message={form.errors.tindakan_perbaikan} />
                    </div>
                    {closing && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="batch-catatan">
                                    Catatan penutupan
                                </Label>
                                <Textarea
                                    id="batch-catatan"
                                    value={form.data.catatan_penutupan}
                                    onChange={(e) =>
                                        form.setData(
                                            'catatan_penutupan',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Hasil perbaikan / verifikasi"
                                />
                                <InputError
                                    message={form.errors.catatan_penutupan}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="batch-foto">
                                    Foto bukti perbaikan
                                    {needsPhoto && (
                                        <span className="text-destructive">
                                            {' '}
                                            *
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    id="batch-foto"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) =>
                                        form.setData(
                                            'foto_penutupan',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Satu foto dipakai untuk semua temuan yang
                                    dipilih. Maks 5 MB.
                                </p>
                                <InputError
                                    message={form.errors.foto_penutupan}
                                />
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : `Terapkan ke ${findings.length} temuan`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function P2hFindings({
    findings,
    counts,
    picOptions,
    sites,
    filters,
    aiEnabled,
    canManage,
    recurringWindowDays,
}: Props) {
    const [editing, setEditing] = useState<Finding | null>(null);
    const [batchOpen, setBatchOpen] = useState(false);
    const selection = useRowSelection(findings.data.map((f) => f.id));
    const selectedFindings = findings.data.filter((f) =>
        selection.isSelected(f.id),
    );
    const title = canManage ? 'Temuan P2H' : 'Temuan Saya';
    const [search, setSearch] = useState(filters.search ?? '');
    const getInitials = useInitials();

    const applyFilter = (
        next: Partial<Props['filters']> & { page?: number },
    ) => {
        router.get(
            '/p2h/findings',
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true },
        );
    };

    const kpis = [
        {
            label: 'Belum selesai',
            value: counts.open + counts.progress,
            sub: `${counts.critical} kritis`,
            tone: 'default' as const,
        },
        {
            label: 'Lewat tenggat',
            value: counts.overdue,
            sub: counts.overdue > 0 ? 'perlu eskalasi ke PIC' : 'Semua sesuai tenggat',
            tone: counts.overdue > 0 ? ('danger' as const) : ('default' as const),
        },
        {
            label: 'Jatuh tempo hari ini',
            value: counts.due_today,
            sub: 'target selesai hari ini',
            tone: counts.due_today > 0 ? ('warning' as const) : ('default' as const),
        },
        {
            label: 'Rata-rata umur open',
            value: counts.avg_age_days === null ? '—' : `${formatNumber(counts.avg_age_days)} hari`,
            sub: 'target ≤ 2 hari',
            tone:
                (counts.avg_age_days ?? 0) > 2
                    ? ('warning' as const)
                    : ('default' as const),
        },
    ];

    return (
        <>
            <Head title={title} />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title={canManage ? 'Temuan' : 'Temuan saya'}
                    description={`${counts.open + counts.progress} belum selesai · ${counts.overdue} lewat tenggat${canManage ? '' : ' · ditugaskan kepada Anda'}`}
                />

                <KpiStrip cols={4}>
                    {kpis.map((k) => (
                        <KpiCard
                            key={k.label}
                            label={k.label}
                            value={k.value}
                            sub={k.sub}
                            tone={k.tone}
                        />
                    ))}
                </KpiStrip>

                {/* ── Filters ── */}
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <form
                        className="relative w-full lg:w-72"
                        onSubmit={(e) => {
                            e.preventDefault();
                            applyFilter({ search: search || null, page: 1 });
                        }}
                    >
                        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari unit atau item"
                            aria-label="Cari temuan"
                            className="h-12 w-full pl-10 lg:h-10"
                        />
                    </form>
                    <FilterChips
                        label="Filter status temuan"
                        value={filters.status}
                        onChange={(v) => applyFilter({ status: v, page: 1 })}
                        className="-mx-4 px-4 lg:mx-0 lg:px-0"
                        options={[
                            { value: 'unresolved', label: 'Belum selesai', count: counts.open + counts.progress },
                            { value: 'overdue', label: 'Lewat tenggat', count: counts.overdue },
                            { value: 'closed', label: 'Closed', count: counts.closed },
                            { value: 'all', label: 'Semua', count: counts.all },
                        ]}
                    />
                    {canManage && sites.length > 1 && (
                        <Select
                            value={filters.site_id ? String(filters.site_id) : 'all'}
                            onValueChange={(v) =>
                                applyFilter({
                                    site_id: v === 'all' ? null : Number(v),
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger
                                aria-label="Filter site"
                                className="h-12 w-full lg:ml-auto lg:h-10 lg:w-44"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua site</SelectItem>
                                {sites.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* ── List: kartu di HP ── */}
                <div className="flex flex-col gap-3 md:hidden">
                    {findings.data.length === 0 && (
                        <p className="rounded-[14px] border py-10 text-center text-sm text-muted-foreground">
                            Tidak ada temuan.
                        </p>
                    )}
                    {findings.data.map((f) => (
                        <FindingCard
                            key={f.id}
                            finding={f}
                            windowDays={recurringWindowDays}
                            onEdit={() => setEditing(f)}
                        />
                    ))}
                </div>

                {/* ── List: tabel di layar lebar (Temuan-Desktop.png) ── */}
                <div className="hidden overflow-x-auto rounded-[14px] border-(length:--bw) md:block">
                    <table className="w-full min-w-[960px] text-sm">
                        <thead className="bg-muted-2 text-left text-xs text-muted-foreground">
                            <tr className="h-11">
                                {canManage && (
                                    <th className="w-12 pl-4">
                                        <Checkbox
                                            checked={
                                                selection.allSelected
                                                    ? true
                                                    : selection.someSelected
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            onCheckedChange={selection.toggleAll}
                                            aria-label="Pilih semua temuan"
                                            disabled={findings.data.length === 0}
                                        />
                                    </th>
                                )}
                                <th className="px-4 font-semibold">ID</th>
                                <SortableHead column="unit" plain className="px-4">
                                    Unit
                                </SortableHead>
                                <SortableHead column="item_nama" plain className="px-4">
                                    Temuan
                                </SortableHead>
                                <SortableHead column="target_selesai" plain className="px-4">
                                    Tenggat
                                </SortableHead>
                                <SortableHead column="status" plain className="px-4">
                                    Status
                                </SortableHead>
                                <SortableHead column="tanggal_temuan" plain className="px-4">
                                    Umur
                                </SortableHead>
                                <SortableHead column="pic" plain className="px-4">
                                    PIC
                                </SortableHead>
                                <th className="px-4">
                                    <span className="sr-only">Aksi</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {findings.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={canManage ? 9 : 8}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        Tidak ada temuan.
                                    </td>
                                </tr>
                            )}
                            {findings.data.map((f) => (
                                <tr
                                    key={f.id}
                                    className={cn(
                                        'h-[60px] border-t-(length:--bw)',
                                        selection.isSelected(f.id) && 'bg-brand-soft',
                                    )}
                                >
                                    {canManage && (
                                        <td className="pl-4">
                                            <Checkbox
                                                checked={selection.isSelected(f.id)}
                                                onCheckedChange={() => selection.toggle(f.id)}
                                                aria-label={`Pilih temuan ${f.no_unit} ${f.item_nama}`}
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 font-mono text-[13px] text-muted-foreground">
                                        {findingCode(f.id)}
                                    </td>
                                    <td className="px-4 font-semibold whitespace-nowrap tnum">
                                        {f.no_unit}
                                    </td>
                                    <td className="max-w-[420px] px-4 py-2.5">
                                        <p className="flex flex-wrap items-center gap-2 font-medium">
                                            {f.item_nama}
                                            {f.kode_bahaya === 'AA' && <KritisTag />}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            P2H {formatDate(f.tanggal_temuan)}
                                            {f.keterangan && ` · ${f.keterangan}`}
                                            {f.keputusan_unit === 'BD' && ' · unit BD'}
                                        </p>
                                        <ReportCount finding={f} />
                                        {f.berulang && (
                                            <FindingFlags
                                                overdue={false}
                                                berulang={f.berulang}
                                                windowDays={recurringWindowDays}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 whitespace-nowrap">
                                        <DueText finding={f} />
                                    </td>
                                    <td className="px-4">
                                        <FindingStatusPill status={f.status} />
                                    </td>
                                    <td className="px-4 whitespace-nowrap tnum">
                                        {f.status === 'closed' ? '—' : ageText(f.tanggal_temuan)}
                                    </td>
                                    <td className="px-4">
                                        {f.pic_name ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span
                                                        tabIndex={0}
                                                        className="grid size-8 place-items-center rounded-full bg-muted text-[11px] font-semibold"
                                                    >
                                                        {getInitials(f.pic_name)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>{f.pic_name}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditing(f)}
                                        >
                                            Buka
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Aksi massal (admin/manager) — BulkBar gelap ── */}
                {canManage && selection.selected.length > 0 && (
                    <div
                        role="region"
                        aria-label="Aksi massal"
                        className="sticky bottom-4 z-20 mx-auto hidden items-center gap-2 rounded-[14px] bg-foreground px-4 py-2.5 text-background shadow-lg md:flex"
                    >
                        <span className="text-sm font-medium tnum">
                            {selection.selected.length} dipilih
                        </span>
                        <Button
                            size="sm"
                            variant="brand"
                            onClick={() => setBatchOpen(true)}
                        >
                            <Pencil className="size-3.5" />
                            Update massal
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-background hover:bg-background/10 hover:text-background"
                            onClick={selection.clear}
                        >
                            Batal
                        </Button>
                    </div>
                )}

                {findings.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Halaman {findings.current_page} dari{' '}
                            {findings.last_page} · {findings.total} temuan
                        </span>
                        <PageButtons
                            currentPage={findings.current_page}
                            lastPage={findings.last_page}
                            onPageChange={(page) => applyFilter({ page })}
                        />
                    </div>
                )}
            </div>

            <BatchFindingDialog
                findings={selectedFindings}
                picOptions={picOptions}
                open={batchOpen}
                onClose={() => setBatchOpen(false)}
                onDone={selection.clear}
            />
            <FindingDialog
                finding={editing}
                picOptions={picOptions}
                aiEnabled={aiEnabled}
                canManage={canManage}
                onClose={() => setEditing(null)}
            />
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

/** Kode tampilan temuan, mis. T-0231 (Temuan-Desktop.png). */
function findingCode(id: number): string {
    return `T-${String(id).padStart(4, '0')}`;
}

function daysBetween(from: string, to = new Date()): number {
    const a = new Date(`${from}T00:00:00`);
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function ageText(tanggal: string): string {
    const d = daysBetween(tanggal);

    return d <= 0 ? 'hari ini' : `${d} hari`;
}

/** Tenggat: merah "Lewat n hari", oranye "Hari ini", selain itu tanggal. */
function DueText({ finding }: { finding: Finding }) {
    if (!finding.target_selesai) {
        return <span className="text-muted-foreground">Belum diatur</span>;
    }

    if (finding.status === 'closed') {
        return <span>{formatDate(finding.target_selesai)}</span>;
    }

    const late = daysBetween(finding.target_selesai);

    if (late > 0) {
        return <span className="font-medium text-danger">Lewat {late} hari</span>;
    }

    if (late === 0) {
        return <span className="font-medium text-warning">Hari ini</span>;
    }

    return <span>{formatDate(finding.target_selesai)}</span>;
}

/** "Dilaporkan 3x · terakhir 24 Sep" untuk temuan gabungan dari beberapa laporan. */
function ReportCount({ finding }: { finding: Finding }) {
    if (finding.jumlah_laporan <= 1) {
        return null;
    }

    return (
        <p className="mt-0.5 text-xs text-muted-foreground">
            Dilaporkan {finding.jumlah_laporan}x
            {finding.terakhir_dilaporkan &&
                ` · terakhir ${formatDate(finding.terakhir_dilaporkan)}`}
        </p>
    );
}

/** Tampilan kartu untuk layar HP (menggantikan tabel 8 kolom). */
/** Kartu temuan ringkas di HP (Temuan.png): ketuk = buka detail/update. */
function FindingCard({
    finding: f,
    windowDays,
    onEdit,
}: {
    finding: Finding;
    windowDays: number;
    onEdit: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onEdit}
            className={cn(
                'flex w-full press items-center gap-3 rounded-[14px] border-(length:--bw) bg-card px-4 py-3.5 text-left',
                f.overdue && 'border-danger/50',
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-[12px]',
                    f.kode_bahaya === 'AA'
                        ? 'bg-danger-soft text-danger'
                        : 'bg-warning-soft text-warning',
                )}
            >
                <AlertTriangle className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                    {f.item_nama}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{findingCode(f.id)}</span>
                    <span className="font-semibold text-foreground tnum">
                        {f.no_unit}
                    </span>
                    <DueText finding={f} />
                    {f.kode_bahaya === 'AA' && <KritisTag />}
                </span>
                {f.berulang && (
                    <FindingFlags
                        overdue={false}
                        berulang={f.berulang}
                        windowDays={windowDays}
                    />
                )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
                <FindingStatusPill status={f.status} />
                <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden
                />
            </span>
        </button>
    );
}

P2hFindings.layout = {
    breadcrumbs: [{ title: 'Temuan', href: '/p2h/findings' }],
};
