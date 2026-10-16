import { Head, router, useForm, useHttp } from '@inertiajs/react';
import {
    AlarmClock,
    Camera,
    ImageIcon,
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
import type { StatusKey } from '@/components/pims/status-pill';
import { StatusPill } from '@/components/pims/status-pill';
import { SortableHead } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useRowSelection } from '@/hooks/use-row-selection';
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
    counts: { open: number; progress: number; overdue: number };
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

    const applyFilter = (
        next: Partial<Props['filters']> & { page?: number },
    ) => {
        router.get(
            '/p2h/findings',
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title={title} />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {canManage
                                ? 'Pantau tindakan perbaikan dan PIC setiap temuan'
                                : 'Temuan yang ditugaskan kepada Anda — perbarui progress perbaikannya'}{' '}
                            ·{' '}
                            <span className="font-medium text-danger">
                                {counts.open} open
                            </span>{' '}
                            ·{' '}
                            <span className="font-medium text-warning">
                                {counts.progress} on progress
                            </span>
                        </p>
                    </div>
                </div>

                {/* ── Overdue alert ── */}
                {counts.overdue > 0 && filters.status !== 'overdue' && (
                    <button
                        type="button"
                        onClick={() =>
                            applyFilter({ status: 'overdue', page: 1 })
                        }
                        className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-left"
                    >
                        <AlarmClock className="h-5 w-5 shrink-0 text-danger" />
                        <p className="text-sm text-danger">
                            <strong>{counts.overdue} temuan</strong> melewati
                            target selesai. Klik untuk melihat.
                        </p>
                    </button>
                )}

                {/* ── Filters ── */}
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <form
                        className="relative w-full sm:w-auto"
                        onSubmit={(e) => {
                            e.preventDefault();
                            applyFilter({ search: search || null, page: 1 });
                        }}
                    >
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari unit / item..."
                            className="w-full pl-9 sm:w-56"
                        />
                    </form>
                    <Select
                        value={filters.status}
                        onValueChange={(v) =>
                            applyFilter({ status: v, page: 1 })
                        }
                    >
                        <SelectTrigger className="h-12 w-full sm:h-10 sm:w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unresolved">
                                Belum selesai
                            </SelectItem>
                            <SelectItem value="overdue">
                                Lewat target
                            </SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="progress">
                                On Progress
                            </SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="all">Semua</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={
                            filters.site_id ? String(filters.site_id) : 'all'
                        }
                        onValueChange={(v) =>
                            applyFilter({
                                site_id: v === 'all' ? null : Number(v),
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            className={cn(
                                'h-12 w-full sm:h-10 sm:w-44',
                                !canManage && 'hidden',
                            )}
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
                </div>

                {/* ── Aksi massal (admin/manager) ── */}
                {canManage && selection.selected.length > 0 && (
                    <div
                        role="region"
                        aria-label="Aksi massal"
                        className="hidden flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 md:flex"
                    >
                        <span className="text-sm font-medium">
                            {selection.selected.length} temuan dipilih
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-muted-foreground"
                            onClick={selection.clear}
                        >
                            Batal pilih
                        </Button>
                        <Button
                            size="sm"
                            className="ml-auto h-8 gap-1.5"
                            onClick={() => setBatchOpen(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Update massal
                        </Button>
                    </div>
                )}

                {/* ── List: kartu di HP ── */}
                <div className="flex flex-col gap-3 md:hidden">
                    {findings.data.length === 0 && (
                        <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
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

                {/* ── List: tabel di layar lebar ── */}
                <Card className="hidden md:block">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                    <tr>
                                        {canManage && (
                                            <th className="w-10 py-3 pl-4">
                                                <Checkbox
                                                    checked={
                                                        selection.allSelected
                                                            ? true
                                                            : selection.someSelected
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={
                                                        selection.toggleAll
                                                    }
                                                    aria-label="Pilih semua temuan"
                                                    disabled={
                                                        findings.data.length ===
                                                        0
                                                    }
                                                />
                                            </th>
                                        )}
                                        <SortableHead
                                            column="tanggal_temuan"
                                            descFirst
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Tanggal
                                        </SortableHead>
                                        <SortableHead
                                            column="unit"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Unit
                                        </SortableHead>
                                        <SortableHead
                                            column="item_nama"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Temuan
                                        </SortableHead>
                                        <SortableHead
                                            column="tindakan_perbaikan"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Tindakan perbaikan
                                        </SortableHead>
                                        <SortableHead
                                            column="pic"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            PIC
                                        </SortableHead>
                                        <SortableHead
                                            column="target_selesai"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Target
                                        </SortableHead>
                                        <SortableHead
                                            column="status"
                                            plain
                                            className="px-4 py-3"
                                        >
                                            Status
                                        </SortableHead>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
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
                                                'align-top',
                                                selection.isSelected(f.id) &&
                                                    'bg-muted/50',
                                            )}
                                        >
                                            {canManage && (
                                                <td className="py-3 pl-4">
                                                    <Checkbox
                                                        checked={selection.isSelected(
                                                            f.id,
                                                        )}
                                                        onCheckedChange={() =>
                                                            selection.toggle(
                                                                f.id,
                                                            )
                                                        }
                                                        aria-label={`Pilih temuan ${f.no_unit} ${f.item_nama}`}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDate(f.tanggal_temuan)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {f.no_unit}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {f.jenis_unit}
                                                </p>
                                                {f.keputusan_unit && (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'mt-1',
                                                            f.keputusan_unit ===
                                                                'BD'
                                                                ? 'border-danger/40 text-danger'
                                                                : 'border-success/40 text-success',
                                                        )}
                                                        title={
                                                            f.alasan_keputusan ??
                                                            undefined
                                                        }
                                                    >
                                                        {f.keputusan_unit ===
                                                        'BD'
                                                            ? 'Diputuskan BD'
                                                            : 'Diputuskan Layak'}
                                                    </Badge>
                                                )}
                                                {f.alasan_keputusan && (
                                                    <p className="mt-1 max-w-48 text-xs text-muted-foreground italic">
                                                        “{f.alasan_keputusan}”
                                                    </p>
                                                )}
                                            </td>
                                            <td className="max-w-64 px-4 py-3">
                                                <p className="font-medium">
                                                    {f.item_nama}
                                                    {f.kode_bahaya === 'AA' && (
                                                        <Badge className="ml-2 bg-danger text-white hover:bg-danger">
                                                            AA
                                                        </Badge>
                                                    )}
                                                </p>
                                                {f.keterangan && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {f.keterangan}
                                                    </p>
                                                )}
                                                <ReportCount finding={f} />
                                                <FindingFlags
                                                    overdue={f.overdue}
                                                    berulang={f.berulang}
                                                    windowDays={
                                                        recurringWindowDays
                                                    }
                                                />
                                            </td>
                                            <td className="max-w-64 px-4 py-3">
                                                {f.tindakan_perbaikan || (
                                                    <span className="text-muted-foreground italic">
                                                        Belum ditentukan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {f.pic_name || (
                                                    <span className="text-muted-foreground italic">
                                                        Belum ditunjuk
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-4 py-3 whitespace-nowrap',
                                                    f.overdue &&
                                                        'font-medium text-danger',
                                                )}
                                            >
                                                {formatDate(f.target_selesai)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <FindingStatusPill
                                                    status={f.status}
                                                />
                                                {f.closed_by && (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        oleh {f.closed_by}
                                                    </p>
                                                )}
                                                {f.foto_url && (
                                                    <a
                                                        href={f.foto_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                    >
                                                        <ImageIcon className="h-3 w-3" />
                                                        Foto bukti
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5"
                                                    onClick={() =>
                                                        setEditing(f)
                                                    }
                                                >
                                                    {f.status === 'closed' ? (
                                                        <Camera className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    )}
                                                    Update
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

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
        <Card className={cn('gap-0 py-0', f.overdue && 'border-danger')}>
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">
                            {f.no_unit}
                            {f.keputusan_unit === 'BD' && (
                                <Badge
                                    variant="outline"
                                    className="ml-2 border-danger/40 text-danger"
                                >
                                    BD
                                </Badge>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {f.jenis_unit} · {formatDate(f.tanggal_temuan)}
                        </p>
                    </div>
                    <FindingStatusPill status={f.status} />
                </div>

                <div>
                    <p className="font-medium">
                        {f.item_nama}
                        {f.kode_bahaya === 'AA' && (
                            <Badge className="ml-2 bg-danger text-white hover:bg-danger">
                                AA
                            </Badge>
                        )}
                    </p>
                    {f.keterangan && (
                        <p className="text-sm text-muted-foreground">
                            {f.keterangan}
                        </p>
                    )}
                    <ReportCount finding={f} />
                    <FindingFlags
                        overdue={f.overdue}
                        berulang={f.berulang}
                        windowDays={windowDays}
                    />
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">PIC</dt>
                    <dd>
                        {f.pic_name || (
                            <span className="text-muted-foreground italic">
                                Belum ditunjuk
                            </span>
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Tindakan</dt>
                    <dd>
                        {f.tindakan_perbaikan || (
                            <span className="text-muted-foreground italic">
                                Belum ditentukan
                            </span>
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Target</dt>
                    <dd className={cn(f.overdue && 'font-medium text-danger')}>
                        {formatDate(f.target_selesai)}
                    </dd>
                </dl>

                <div className="flex items-center justify-between gap-2">
                    {f.foto_url ? (
                        <a
                            href={f.foto_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Foto bukti
                        </a>
                    ) : (
                        <span />
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={onEdit}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Update
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

P2hFindings.layout = {
    breadcrumbs: [{ title: 'Temuan P2H', href: '/p2h/findings' }],
};
