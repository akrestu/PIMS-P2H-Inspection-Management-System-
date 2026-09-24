import { Head, router, useForm, useHttp } from '@inertiajs/react';
import {
    AlarmClock,
    Camera,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Pencil,
    Repeat,
    Search,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    suggest,
    update,
} from '@/actions/App/Http/Controllers/P2hFindingController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        className:
            'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    },
    progress: {
        label: 'On Progress',
        className:
            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    },
    closed: {
        label: 'Closed',
        className:
            'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    },
};

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
                    className="gap-1 border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                >
                    <AlarmClock className="h-3 w-3" /> Lewat target
                </Badge>
            )}
            {berulang && (
                <Badge
                    variant="outline"
                    className="gap-1 border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400"
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

    const needsPhoto = form.data.status === 'closed' && !finding?.foto_url;

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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
                                    {finding?.foto_url
                                        ? 'Unggah foto baru untuk mengganti.'
                                        : 'Wajib untuk menutup temuan. Maks 5 MB.'}
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
            <div className="flex flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                            <Wrench className="h-6 w-6 text-primary" />
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {canManage
                                ? 'Pantau tindakan perbaikan dan PIC setiap temuan'
                                : 'Temuan yang ditugaskan kepada Anda — perbarui progress perbaikannya'}{' '}
                            ·{' '}
                            <span className="font-medium text-red-600">
                                {counts.open} open
                            </span>{' '}
                            ·{' '}
                            <span className="font-medium text-amber-600">
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
                        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left dark:border-red-900 dark:bg-red-950/20"
                    >
                        <AlarmClock className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                            <strong>{counts.overdue} temuan</strong> melewati
                            target selesai. Klik untuk melihat.
                        </p>
                    </button>
                )}

                {/* ── Filters ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <form
                        className="relative"
                        onSubmit={(e) => {
                            e.preventDefault();
                            applyFilter({ search: search || null, page: 1 });
                        }}
                    >
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari unit / item..."
                            className="h-9 w-56 pl-8"
                        />
                    </form>
                    <Select
                        value={filters.status}
                        onValueChange={(v) =>
                            applyFilter({ status: v, page: 1 })
                        }
                    >
                        <SelectTrigger className="h-9 w-44">
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
                            className={cn('h-9 w-44', !canManage && 'hidden')}
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
                                        <th className="px-4 py-3">Tanggal</th>
                                        <th className="px-4 py-3">Unit</th>
                                        <th className="px-4 py-3">Temuan</th>
                                        <th className="px-4 py-3">
                                            Tindakan perbaikan
                                        </th>
                                        <th className="px-4 py-3">PIC</th>
                                        <th className="px-4 py-3">Target</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {findings.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Tidak ada temuan.
                                            </td>
                                        </tr>
                                    )}
                                    {findings.data.map((f) => (
                                        <tr key={f.id} className="align-top">
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
                                                                ? 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400'
                                                                : 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400',
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
                                                        <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600">
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
                                                        'font-medium text-red-600',
                                                )}
                                            >
                                                {formatDate(f.target_selesai)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        STATUS_CONFIG[f.status]
                                                            .className,
                                                    )}
                                                >
                                                    {
                                                        STATUS_CONFIG[f.status]
                                                            .label
                                                    }
                                                </Badge>
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
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={findings.current_page <= 1}
                                onClick={() =>
                                    applyFilter({
                                        page: findings.current_page - 1,
                                    })
                                }
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                    findings.current_page >= findings.last_page
                                }
                                onClick={() =>
                                    applyFilter({
                                        page: findings.current_page + 1,
                                    })
                                }
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

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
        <Card className={cn(f.overdue && 'border-red-300 dark:border-red-900')}>
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">
                            {f.no_unit}
                            {f.keputusan_unit === 'BD' && (
                                <Badge
                                    variant="outline"
                                    className="ml-2 border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                                >
                                    BD
                                </Badge>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {f.jenis_unit} · {formatDate(f.tanggal_temuan)}
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            'shrink-0',
                            STATUS_CONFIG[f.status].className,
                        )}
                    >
                        {STATUS_CONFIG[f.status].label}
                    </Badge>
                </div>

                <div>
                    <p className="font-medium">
                        {f.item_nama}
                        {f.kode_bahaya === 'AA' && (
                            <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600">
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
                    <dd className={cn(f.overdue && 'font-medium text-red-600')}>
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
