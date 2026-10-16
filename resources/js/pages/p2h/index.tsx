import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PageButtons } from '@/components/pagination-bar';
import { FilterChips } from '@/components/pims/filter-chips';
import { ListCard } from '@/components/pims/list-card';
import { PageHeader } from '@/components/pims/page-header';
import { EmptyState } from '@/components/pims/states';
import { StatusPill } from '@/components/pims/status-pill';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate, formatHM } from '@/lib/format';

interface P2hEntrySummary {
    driver: string | null;
    shift: string | null;
    time: string | null;
}

interface P2hRow {
    id: number;
    tanggal: string;
    no_unit: string;
    jenis_unit: string;
    slot_terisi: number;
    total_tl: number;
    status: string;
    entries: P2hEntrySummary[];
    hasil: 'Layak Pakai' | 'BD' | null;
    approval: 'pending' | 'approved' | 'rejected' | null;
    hm_akhir: number | string | null;
}

interface PaginatedData {
    data: P2hRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    date_from?: string;
    date_to?: string;
    no_unit?: string;
    jenis_unit?: string;
    hasil?: string;
    user_id?: string;
    [key: string]: string | undefined;
}

interface SimpleUser {
    id: number;
    name: string;
}

interface Props {
    sessions: PaginatedData;
    filters: Filters;
    allUsers: SimpleUser[];
}

// Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one in WIB timezone
function parseDateLocal(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);

    return new Date(y, m - 1, d);
}

// ── Quick filter chips ────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);

    return d.toISOString().split('T')[0];
})();

const QUICK_FILTERS = [
    { label: 'Hari Ini', value: { date_from: today, date_to: today } },
    { label: 'Minggu Ini', value: { date_from: weekStart, date_to: today } },
    { label: 'Ada TL', value: { hasil: 'ada_tl' } },
    { label: 'Semua Layak', value: { hasil: 'semua_layak' } },
    { label: 'Bus', value: { jenis_unit: 'Bus' } },
    { label: 'LV', value: { jenis_unit: 'Light Vehicle' } },
];

function isQuickActive(qf: (typeof QUICK_FILTERS)[0], form: Filters) {
    return Object.entries(qf.value).every(([k, v]) => form[k] === v);
}

// ── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteDialog({
    row,
    open,
    onClose,
}: {
    row: P2hRow | null;
    open: boolean;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        if (!row) {
            return;
        }

        setProcessing(true);
        router.delete(`/p2h/${row.id}`, {
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
                        Hapus Riwayat P2H
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2 pt-1 text-sm text-muted-foreground">
                            <p>
                                Anda akan menghapus sesi P2H berikut secara
                                permanen:
                            </p>
                            {row && (
                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    <p className="font-semibold text-foreground">
                                        {row.no_unit}
                                    </p>
                                    <p className="text-xs">
                                        {parseDateLocal(
                                            row.tanggal,
                                        ).toLocaleDateString('id-ID', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                        {' · '}
                                        {row.slot_terisi}x P2H ·{' '}
                                        {row.total_tl > 0
                                            ? `${row.total_tl} item TL`
                                            : 'Semua Layak'}
                                    </p>
                                </div>
                            )}
                            <p className="font-medium text-destructive">
                                Semua data checklist, tanda tangan, dan log
                                bahan bakar dalam sesi ini akan ikut terhapus
                                dan tidak dapat dikembalikan.
                            </p>
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
                        Hapus Permanen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────
// ── Format baris (docs/screens/driver.md · Riwayat P2H) ──────────────────────
const shiftLabel = (shift?: string | null) =>
    shift
        ? shift.replace('Shift II', 'Shift 2').replace('Shift I', 'Shift 1')
        : '—';

function dayLabel(iso: string): string {
    const date = parseDateLocal(iso);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const diff = Math.round((startToday.getTime() - date.getTime()) / 86400000);

    if (diff === 0) {
        return 'Hari ini';
    }

    if (diff === 1) {
        return 'Kemarin';
    }

    return formatDate(date, {
        withDay: true,
        withYear: date.getFullYear() !== startToday.getFullYear(),
    });
}

function ResultPill({ row }: { row: P2hRow }) {
    if (!row.hasil) {
        return <span className="text-muted-foreground">—</span>;
    }

    return row.hasil === 'BD' ? (
        <StatusPill status="tidak-layak" />
    ) : (
        <StatusPill status="layak" />
    );
}

function ApprovalPill({ row }: { row: P2hRow }) {
    switch (row.approval) {
        case 'pending':
            return <StatusPill status="menunggu" />;
        case 'rejected':
            return <StatusPill status="ditolak" />;
        case 'approved':
            return <StatusPill status="disetujui" />;
        default:
            return (
                <span className="text-sm text-muted-foreground">
                    Tidak perlu
                </span>
            );
    }
}

function DriversCell({ row }: { row: P2hRow }) {
    const [first, ...rest] = row.entries;

    if (!first) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (rest.length === 0) {
        return <span>{first.driver ?? '—'}</span>;
    }

    return (
        <Tooltip>
            <TooltipTrigger className="text-left underline decoration-dotted underline-offset-4">
                {first.driver} +{rest.length}
            </TooltipTrigger>
            <TooltipContent>
                {row.entries
                    .map((e) => `${e.driver ?? '—'} · ${e.time ?? '—'}`)
                    .join(' → ')}
            </TooltipContent>
        </Tooltip>
    );
}

const checklistText = (row: P2hRow) =>
    row.total_tl > 0 ? `${row.total_tl} item Tidak Layak` : 'Semua layak';

export default function P2hIndex({ sessions, filters, allUsers }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>()
        .props;
    const isAdmin = auth?.user?.roles?.includes('admin') ?? false;

    const [form, setForm] = useState<Filters>(filters);
    const [showFilter, setShowFilter] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<P2hRow | null>(null);

    const hasActiveFilters = Object.values(form).some(Boolean);
    const activeCount = Object.values(form).filter(Boolean).length;
    const exportQuery = new URLSearchParams(
        Object.fromEntries(
            Object.entries(form).filter(([, v]) => v != null && v !== '') as [
                string,
                string,
            ][],
        ),
    ).toString();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/p2h', form, { preserveState: true });
    };

    const handleReset = () => {
        setForm({});
        router.get('/p2h', {});
    };

    const applyQuickFilter = (qf: (typeof QUICK_FILTERS)[0]) => {
        const newForm = isQuickActive(qf, form)
            ? {}
            : ({ ...qf.value } as Filters);
        setForm(newForm);
        router.get('/p2h', newForm, { preserveState: true });
    };

    const goToPage = (page: number) => {
        router.get('/p2h', { ...filters, page }, { preserveState: true });
    };

    // Kelompok per hari untuk tampilan mobile
    const groups = sessions.data.reduce<{ day: string; rows: P2hRow[] }[]>(
        (acc, row) => {
            const day = dayLabel(row.tanggal);
            const last = acc.at(-1);

            if (last && last.day === day) {
                last.rows.push(row);
            } else {
                acc.push({ day, rows: [row] });
            }

            return acc;
        },
        [],
    );

    return (
        <>
            <Head title="Riwayat P2H" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <PageHeader
                    title="Riwayat P2H"
                    description={
                        sessions.total > 0
                            ? `${sessions.total} sesi${hasActiveFilters ? ' sesuai filter' : ''}`
                            : 'Belum ada data'
                    }
                    actions={
                        <>
                            <Button
                                variant={showFilter ? 'default' : 'outline'}
                                onClick={() => setShowFilter((v) => !v)}
                                aria-expanded={showFilter}
                            >
                                <SlidersHorizontal />
                                Filter
                                {activeCount > 0 && (
                                    <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                                        {activeCount}
                                    </span>
                                )}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                        Unduh Riwayat P2H
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <a
                                            href={`/export/history-p2h/pdf?${exportQuery}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex cursor-pointer items-center gap-2"
                                        >
                                            <FileText className="size-4" />
                                            Export PDF
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <a
                                            href={`/export/history-p2h/excel?${exportQuery}`}
                                            className="flex cursor-pointer items-center gap-2"
                                        >
                                            <FileSpreadsheet className="size-4" />
                                            Export Excel
                                        </a>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    }
                />

                <FilterChips
                    label="Filter cepat"
                    options={QUICK_FILTERS.map((qf) => ({
                        value: qf.label,
                        label: qf.label,
                    }))}
                    value={QUICK_FILTERS.filter((qf) =>
                        isQuickActive(qf, form),
                    ).map((qf) => qf.label)}
                    onChange={(label) => {
                        const qf = QUICK_FILTERS.find((q) => q.label === label);

                        if (qf) {
                            applyQuickFilter(qf);
                        }
                    }}
                />

                {/* ── Advanced Filter Panel ── */}
                {showFilter && (
                    <Card className="border-border">
                        <CardContent className="pt-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">
                                    Filter Lanjutan
                                </span>
                            </div>
                            <form
                                onSubmit={handleSearch}
                                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                            >
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                        Dari Tanggal
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.date_from ?? ''}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                date_from: e.target.value,
                                            })
                                        }
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                        Sampai Tanggal
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.date_to ?? ''}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                date_to: e.target.value,
                                            })
                                        }
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                        No. Unit
                                    </Label>
                                    <Input
                                        value={form.no_unit ?? ''}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                no_unit: e.target.value,
                                            })
                                        }
                                        placeholder="Cari no. unit…"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                        Jenis Unit
                                    </Label>
                                    <Select
                                        value={form.jenis_unit ?? 'all'}
                                        onValueChange={(v) =>
                                            setForm({
                                                ...form,
                                                jenis_unit:
                                                    v === 'all' ? undefined : v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-10 w-full">
                                            <SelectValue placeholder="Semua jenis" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                Semua jenis
                                            </SelectItem>
                                            <SelectItem value="Bus">
                                                Bus
                                            </SelectItem>
                                            <SelectItem value="Light Vehicle">
                                                Light Vehicle
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                        Hasil Pemeriksaan
                                    </Label>
                                    <Select
                                        value={form.hasil ?? 'all'}
                                        onValueChange={(v) =>
                                            setForm({
                                                ...form,
                                                hasil:
                                                    v === 'all' ? undefined : v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-10 w-full">
                                            <SelectValue placeholder="Semua hasil" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                Semua hasil
                                            </SelectItem>
                                            <SelectItem value="ada_tl">
                                                Ada Item Tidak Layak
                                            </SelectItem>
                                            <SelectItem value="semua_layak">
                                                Semua Layak
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {allUsers.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">
                                            Driver
                                        </Label>
                                        <Select
                                            value={form.user_id ?? 'all'}
                                            onValueChange={(v) =>
                                                setForm({
                                                    ...form,
                                                    user_id:
                                                        v === 'all'
                                                            ? undefined
                                                            : v,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="h-10 w-full">
                                                <SelectValue placeholder="Semua driver" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Semua driver
                                                </SelectItem>
                                                {allUsers.map((u) => (
                                                    <SelectItem
                                                        key={u.id}
                                                        value={String(u.id)}
                                                    >
                                                        {u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <Button
                                        type="submit"
                                        className="h-10 flex-1 gap-2"
                                    >
                                        <Search className="h-4 w-4" />
                                        Cari
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 gap-2"
                                        onClick={handleReset}
                                    >
                                        <X className="h-4 w-4" />
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {sessions.data.length === 0 ? (
                    <EmptyState
                        title="Tidak ada data P2H"
                        description={
                            hasActiveFilters
                                ? 'Coba ubah atau hapus filter pencarian.'
                                : 'Belum ada sesi P2H yang tercatat.'
                        }
                        action={
                            hasActiveFilters && (
                                <Button variant="outline" onClick={handleReset}>
                                    <X />
                                    Hapus filter
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        {/* Mobile: kartu dikelompokkan per hari */}
                        <div className="space-y-5 lg:hidden">
                            {groups.map((group) => (
                                <section key={group.day} className="space-y-2">
                                    <h2 className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                                        {group.day}
                                    </h2>
                                    {group.rows.map((row) => (
                                        <ListCard
                                            key={row.id}
                                            title={row.no_unit}
                                            meta={[
                                                row.jenis_unit,
                                                shiftLabel(
                                                    row.entries[0]?.shift,
                                                ),
                                                row.entries[0]?.time,
                                                row.entries
                                                    .map((e) => e.driver)
                                                    .filter(Boolean)
                                                    .join(', '),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            trailing={
                                                <span className="flex flex-col items-end gap-1">
                                                    <ResultPill row={row} />
                                                    {row.approval ===
                                                        'pending' && (
                                                        <StatusPill
                                                            status="menunggu"
                                                            size="sm"
                                                        />
                                                    )}
                                                </span>
                                            }
                                            onOpen={() =>
                                                router.visit(`/p2h/${row.id}`)
                                            }
                                        />
                                    ))}
                                </section>
                            ))}
                        </div>

                        {/* Desktop: tabel */}
                        <TableContainer className="hidden lg:block">
                            <Table className="min-w-[960px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Shift</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Checklist</TableHead>
                                        <TableHead className="text-right">
                                            HM akhir
                                        </TableHead>
                                        <TableHead>Hasil</TableHead>
                                        <TableHead>Persetujuan</TableHead>
                                        <TableHead>
                                            <span className="sr-only">
                                                Aksi
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatDate(
                                                    parseDateLocal(row.tanggal),
                                                )}
                                                {row.entries[0]?.time && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        · {row.entries[0].time}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="block font-semibold whitespace-nowrap">
                                                    {row.no_unit}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {row.jenis_unit}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {shiftLabel(
                                                    row.entries[0]?.shift,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DriversCell row={row} />
                                            </TableCell>
                                            <TableCell
                                                className={
                                                    row.total_tl > 0
                                                        ? 'font-medium text-danger'
                                                        : 'text-muted-foreground'
                                                }
                                            >
                                                {checklistText(row)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {row.hm_akhir
                                                    ? formatHM(row.hm_akhir)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <ResultPill row={row} />
                                            </TableCell>
                                            <TableCell>
                                                <ApprovalPill row={row} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1.5">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Link
                                                            href={`/p2h/${row.id}`}
                                                        >
                                                            Detail
                                                            <ChevronRight />
                                                        </Link>
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-danger"
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    row,
                                                                )
                                                            }
                                                            aria-label={`Hapus sesi ${row.no_unit}`}
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                            <p className="text-xs text-muted-foreground">
                                {sessions.from}–{sessions.to} dari{' '}
                                {sessions.total} sesi · Satu sesi = satu unit
                                per hari; pergantian driver tercatat sebagai
                                entry terpisah.
                            </p>
                            {sessions.last_page > 1 && (
                                <PageButtons
                                    currentPage={sessions.current_page}
                                    lastPage={sessions.last_page}
                                    onPageChange={goToPage}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            <DeleteDialog
                row={deleteTarget}
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
            />
        </>
    );
}

P2hIndex.layout = {
    breadcrumbs: [{ title: 'Riwayat P2H', href: '/p2h' }],
};
