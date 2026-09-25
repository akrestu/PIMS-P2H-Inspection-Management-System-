import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ClipboardX,
    FileSpreadsheet,
    Fuel,
    Search,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Temuan {
    item: string;
    kode_bahaya: string | null;
    keterangan: string | null;
    status: 'open' | 'progress' | 'closed' | null;
    status_label: string | null;
    tindakan: string | null;
    pic: string | null;
    target_selesai: string | null;
}

interface Row {
    tanggal: string;
    unit_id: number;
    no_unit: string;
    no_lambung: string | null;
    jenis_unit: string;
    site: string | null;
    session_id: number | null;
    terisi: boolean;
    shifts: string[];
    drivers: string[];
    pending_approval: boolean;
    kondisi: 'Layak Pakai' | 'BD' | null;
    temuan: Temuan[];
    km: number | null;
    bbm_liter: number | null;
}

interface Filters {
    start: string;
    end: string;
    site_id: number | null;
    jenis_unit: string | null;
    search: string | null;
    status: string | null;
}

interface Props {
    rows: {
        data: Row[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    summary: {
        total: number;
        terisi: number;
        kosong: number;
        temuan: number;
        bd: number;
        bbm_liter: number;
    };
    filters: Filters;
    sites: { id: number; name: string }[];
    maxDays: number;
}

const STATUS_FILTERS = [
    { value: null, label: 'Semua' },
    { value: 'terisi', label: 'Terisi' },
    { value: 'kosong', label: 'Tidak mengisi' },
    { value: 'temuan', label: 'Ada temuan' },
    { value: 'bbm', label: 'Isi BBM' },
] as const;

const FINDING_STATUS_CLASS: Record<string, string> = {
    open: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400',
    progress:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
    closed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
};

const num = (v: number | null | undefined, digits = 0) =>
    v === null || v === undefined
        ? '—'
        : v.toLocaleString('id-ID', { maximumFractionDigits: digits });

const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UnitMonitoring({
    rows,
    summary,
    filters,
    sites,
    maxDays,
}: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [range, setRange] = useState({
        start: filters.start,
        end: filters.end,
    });
    const [search, setSearch] = useState(filters.search ?? '');

    const query = (next: Partial<Filters> = {}) =>
        Object.fromEntries(
            Object.entries({ ...filters, ...next }).filter(
                ([, v]) => v !== null && v !== '',
            ),
        ) as Record<string, string>;

    const applyFilter = (next: Partial<Filters>) => {
        router.get('/unit-monitoring', query(next), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        router.get(
            '/unit-monitoring',
            { ...query(), page: String(page) },
            { preserveState: true },
        );
    };

    const exportUrl = `/unit-monitoring/excel?${new URLSearchParams(query()).toString()}`;

    return (
        <>
            <Head title="Monitoring Harian Unit" />
            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* ── Header ── */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                            <CalendarDays className="h-6 w-6 text-primary" />
                            Monitoring Harian Unit
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pengisian P2H, temuan & tindak lanjut, KM, dan BBM
                            per unit per hari
                        </p>
                    </div>
                    <Button asChild variant="outline" className="gap-1.5">
                        <a href={exportUrl}>
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            Export Excel
                        </a>
                    </Button>
                </div>

                {/* ── Filters ── */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="start">Dari</Label>
                        <Input
                            id="start"
                            type="date"
                            className="h-9 w-38"
                            value={range.start}
                            onChange={(e) =>
                                setRange((r) => ({
                                    ...r,
                                    start: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="end">Sampai</Label>
                        <Input
                            id="end"
                            type="date"
                            className="h-9 w-38"
                            value={range.end}
                            onChange={(e) =>
                                setRange((r) => ({ ...r, end: e.target.value }))
                            }
                        />
                    </div>
                    <Button
                        size="sm"
                        className="h-9"
                        onClick={() => applyFilter(range)}
                    >
                        Terapkan
                    </Button>
                    <div className="space-y-1.5">
                        <Label>Jenis unit</Label>
                        <Select
                            value={filters.jenis_unit ?? 'all'}
                            onValueChange={(v) =>
                                applyFilter({
                                    jenis_unit: v === 'all' ? null : v,
                                })
                            }
                        >
                            <SelectTrigger className="h-9 w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">LV & Bus</SelectItem>
                                <SelectItem value="Light Vehicle">
                                    Light Vehicle
                                </SelectItem>
                                <SelectItem value="Bus">Bus</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Site</Label>
                        <Select
                            value={
                                filters.site_id
                                    ? String(filters.site_id)
                                    : 'all'
                            }
                            onValueChange={(v) =>
                                applyFilter({
                                    site_id: v === 'all' ? null : Number(v),
                                })
                            }
                        >
                            <SelectTrigger className="h-9 w-40">
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
                    <form
                        className="space-y-1.5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            applyFilter({ search: search.trim() || null });
                        }}
                    >
                        <Label htmlFor="search">Cari unit</Label>
                        <div className="relative">
                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                className="h-9 w-44 pl-8"
                                placeholder="No. unit / lambung"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </form>
                    {errors.end && (
                        <p className="w-full text-xs text-destructive">
                            {errors.end}
                        </p>
                    )}
                    <p className="w-full text-xs text-muted-foreground">
                        Rentang maksimal {maxDays} hari.
                    </p>
                </div>

                {/* ── Summary ── */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <SummaryCard
                        icon={ClipboardCheck}
                        label="Terisi P2H"
                        value={`${num(summary.terisi)} / ${num(summary.total)}`}
                        className="text-emerald-600"
                    />
                    <SummaryCard
                        icon={ClipboardX}
                        label="Tidak mengisi"
                        value={num(summary.kosong)}
                        className="text-red-600"
                    />
                    <SummaryCard
                        icon={Wrench}
                        label="Temuan"
                        value={num(summary.temuan)}
                        className="text-amber-600"
                    />
                    <SummaryCard
                        icon={AlertTriangle}
                        label="Hari kondisi BD"
                        value={num(summary.bd)}
                        className="text-orange-600"
                    />
                    <SummaryCard
                        icon={Fuel}
                        label="Total BBM"
                        value={`${num(summary.bbm_liter, 2)} L`}
                        className="text-sky-600"
                    />
                </div>

                {/* ── Status filter ── */}
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((s) => (
                        <Button
                            key={s.label}
                            size="sm"
                            variant={
                                (filters.status ?? null) === s.value
                                    ? 'default'
                                    : 'outline'
                            }
                            className="h-8 text-xs"
                            onClick={() => applyFilter({ status: s.value })}
                        >
                            {s.label}
                        </Button>
                    ))}
                </div>

                {/* ── Table ── */}
                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead className="bg-muted/60 text-xs text-muted-foreground">
                            <tr className="text-left">
                                <th className="px-3 py-2.5 font-medium">
                                    Tanggal
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Unit
                                </th>
                                <th className="px-3 py-2.5 font-medium">P2H</th>
                                <th className="px-3 py-2.5 font-medium">
                                    Temuan
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Action / Tindak Lanjut
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    KM
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    BBM (L)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-3 py-12 text-center text-muted-foreground"
                                    >
                                        Tidak ada data untuk filter ini.
                                    </td>
                                </tr>
                            )}
                            {rows.data.map((row) => (
                                <MonitoringRow
                                    key={`${row.unit_id}-${row.tanggal}`}
                                    row={row}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {rows.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {rows.from}–{rows.to} dari{' '}
                            <span className="font-medium">{rows.total}</span>{' '}
                            baris
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={rows.current_page === 1}
                                onClick={() => goToPage(rows.current_page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2 text-sm tabular-nums">
                                {rows.current_page} / {rows.last_page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={rows.current_page === rows.last_page}
                                onClick={() => goToPage(rows.current_page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

function SummaryCard({
    icon: Icon,
    label,
    value,
    className,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <Icon className={cn('h-5 w-5 shrink-0', className)} />
            <div className="min-w-0">
                <p className="text-lg leading-tight font-bold tabular-nums">
                    {value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

function MonitoringRow({ row }: { row: Row }) {
    return (
        <tr
            className={cn(
                'align-top',
                !row.terisi && 'bg-red-50/40 dark:bg-red-950/10',
            )}
        >
            <td className="px-3 py-2.5 whitespace-nowrap">
                {fmtDate(row.tanggal)}
            </td>
            <td className="px-3 py-2.5">
                <p className="font-semibold">{row.no_unit}</p>
                <p className="text-xs text-muted-foreground">
                    {row.jenis_unit === 'Light Vehicle' ? 'LV' : row.jenis_unit}
                    {row.no_lambung && ` · ${row.no_lambung}`}
                    {row.site && ` · ${row.site}`}
                </p>
            </td>
            <td className="px-3 py-2.5">
                {row.terisi ? (
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                            {row.session_id ? (
                                <Link
                                    href={`/p2h/${row.session_id}`}
                                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                                >
                                    ✓ {row.shifts.join(', ') || 'Terisi'}
                                </Link>
                            ) : null}
                            {row.kondisi === 'BD' && (
                                <Badge variant="destructive" className="h-5">
                                    BD
                                </Badge>
                            )}
                            {row.pending_approval && (
                                <Badge
                                    variant="outline"
                                    className="h-5 border-amber-300 text-amber-700 dark:text-amber-400"
                                >
                                    Menunggu approval
                                </Badge>
                            )}
                        </div>
                        {row.drivers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {row.drivers.join(', ')}
                            </p>
                        )}
                    </div>
                ) : (
                    <span className="font-medium text-red-600 dark:text-red-400">
                        ✗ Tidak mengisi
                    </span>
                )}
            </td>
            <td className="px-3 py-2.5">
                {row.temuan.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                ) : (
                    <ul className="space-y-1.5">
                        {row.temuan.map((t, i) => (
                            <li key={i}>
                                <span className="font-medium">{t.item}</span>
                                {t.kode_bahaya === 'AA' && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1 h-4 px-1 text-[10px]"
                                    >
                                        AA
                                    </Badge>
                                )}
                                {t.keterangan && (
                                    <p className="text-xs text-muted-foreground">
                                        {t.keterangan}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </td>
            <td className="px-3 py-2.5">
                {row.temuan.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                ) : (
                    <ul className="space-y-1.5">
                        {row.temuan.map((t, i) => (
                            <li key={i} className="text-xs">
                                <div className="flex flex-wrap items-center gap-1">
                                    {t.status && (
                                        <span
                                            className={cn(
                                                'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                                FINDING_STATUS_CLASS[t.status],
                                            )}
                                        >
                                            {t.status_label}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            !t.tindakan &&
                                                'text-muted-foreground italic',
                                        )}
                                    >
                                        {t.tindakan ?? 'Belum ada tindakan'}
                                    </span>
                                </div>
                                {(t.pic || t.target_selesai) && (
                                    <p className="mt-0.5 text-muted-foreground">
                                        {t.pic && `PIC: ${t.pic}`}
                                        {t.pic && t.target_selesai && ' · '}
                                        {t.target_selesai &&
                                            `Target: ${t.target_selesai}`}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
                {num(row.km)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
                {num(row.bbm_liter, 2)}
            </td>
        </tr>
    );
}

UnitMonitoring.layout = {
    breadcrumbs: [
        { title: 'Monitoring Harian Unit', href: '/unit-monitoring' },
    ],
};
