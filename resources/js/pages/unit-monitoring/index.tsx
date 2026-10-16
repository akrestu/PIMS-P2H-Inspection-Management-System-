import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    FileSpreadsheet,
    Search,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { PageTabs } from '@/components/page-tabs';
import { PageButtons } from '@/components/pagination-bar';
import { SortableHead } from '@/components/sortable-head';
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
    open: 'border-danger/40 bg-danger-soft text-danger   ',
    progress: 'border-warning/40 bg-warning-soft text-warning   ',
    closed: 'border-success/40 bg-success-soft text-success   ',
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
                <PageTabs group="p2hMonitoring" />
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
                            <FileSpreadsheet className="h-4 w-4 text-success" />
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

                {/* ── Mobile: kartu ── */}
                <div className="divide-y rounded-xl border md:hidden">
                    {rows.data.length === 0 ? (
                        <p className="px-3 py-12 text-center text-sm text-muted-foreground">
                            Tidak ada data untuk filter ini.
                        </p>
                    ) : (
                        rows.data.map((row) => (
                            <MonitoringCard
                                key={`${row.unit_id}-${row.tanggal}`}
                                row={row}
                            />
                        ))
                    )}
                </div>

                {/* ── Table (tablet & desktop) ── */}
                <div className="hidden overflow-x-auto rounded-xl border md:block">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead className="bg-muted/60 text-xs text-muted-foreground">
                            <tr className="text-left">
                                <SortableHead
                                    column="tanggal"
                                    descFirst
                                    plain
                                    className="px-3 py-2.5 font-medium"
                                >
                                    Tanggal
                                </SortableHead>
                                <SortableHead
                                    column="unit"
                                    plain
                                    className="px-3 py-2.5 font-medium"
                                >
                                    Unit
                                </SortableHead>
                                <SortableHead
                                    column="p2h"
                                    plain
                                    className="px-3 py-2.5 font-medium"
                                >
                                    P2H
                                </SortableHead>
                                <SortableHead
                                    column="temuan"
                                    descFirst
                                    plain
                                    className="px-3 py-2.5 font-medium"
                                >
                                    Temuan
                                </SortableHead>
                                <th className="px-3 py-2.5 font-medium">
                                    Action / Tindak Lanjut
                                </th>
                                <SortableHead
                                    column="km"
                                    descFirst
                                    plain
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    KM
                                </SortableHead>
                                <SortableHead
                                    column="bbm"
                                    descFirst
                                    plain
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    BBM (L)
                                </SortableHead>
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
                        <PageButtons
                            currentPage={rows.current_page}
                            lastPage={rows.last_page}
                            onPageChange={goToPage}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

/** PIC paling banyak di satu unit-hari: ditulis sekali, bukan diulang di setiap temuan. */
function mainPicOf(row: Row): { mainPic: string | null; allSamePic: boolean } {
    const picCounts = new Map<string | null, number>();
    row.temuan.forEach((t) =>
        picCounts.set(t.pic ?? null, (picCounts.get(t.pic ?? null) ?? 0) + 1),
    );

    return {
        mainPic:
            [...picCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
            null,
        allSamePic: picCounts.size <= 1,
    };
}

/** Kartu unit-hari untuk layar HP (tabel 7 kolom tidak muat). */
function MonitoringCard({ row }: { row: Row }) {
    const { mainPic, allSamePic } = mainPicOf(row);

    return (
        <div className={cn('space-y-2 p-4', !row.terisi && 'bg-danger-soft')}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold">{row.no_unit}</p>
                    <p className="text-xs text-muted-foreground">
                        {fmtDate(row.tanggal)} ·{' '}
                        {row.jenis_unit === 'Light Vehicle'
                            ? 'LV'
                            : row.jenis_unit}
                        {row.site && ` · ${row.site}`}
                    </p>
                </div>
                {row.terisi ? (
                    <Link
                        href={`/p2h/${row.session_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-success"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {row.shifts.join(', ') || 'Terisi'}
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-danger">
                        <XCircle className="h-4 w-4" />
                        Tidak mengisi
                    </span>
                )}
            </div>

            {row.terisi && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {row.kondisi === 'BD' && (
                        <Badge variant="destructive" className="h-5">
                            BD
                        </Badge>
                    )}
                    {row.pending_approval && (
                        <Badge
                            variant="outline"
                            className="h-5 border-warning/40 text-warning"
                        >
                            Menunggu approval
                        </Badge>
                    )}
                    <span className="text-muted-foreground">
                        {row.drivers.join(', ')}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <p className="text-muted-foreground">KM</p>
                    <p className="font-medium tabular-nums">{num(row.km)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">BBM</p>
                    <p className="font-medium tabular-nums">
                        {row.bbm_liter ? `${num(row.bbm_liter, 2)} L` : '—'}
                    </p>
                </div>
            </div>

            {row.temuan.length > 0 && (
                <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
                    <p className="text-xs font-semibold">
                        Temuan ({row.temuan.length})
                    </p>
                    {row.temuan.map((t, i) => (
                        <div key={i} className="text-xs">
                            <p>
                                <span className="font-medium">{t.item}</span>
                                {t.kode_bahaya === 'AA' && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1 h-4 px-1 text-xs"
                                    >
                                        AA
                                    </Badge>
                                )}
                                {t.keterangan && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        — {t.keterangan}
                                    </span>
                                )}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-muted-foreground">
                                {t.status && (
                                    <span
                                        className={cn(
                                            'rounded border px-1.5 py-0.5 text-xs font-medium',
                                            FINDING_STATUS_CLASS[t.status],
                                        )}
                                    >
                                        {t.status_label}
                                    </span>
                                )}
                                {t.tindakan ?? 'Belum ada tindakan'}
                                {(t.pic ?? null) !== mainPic &&
                                    ` · PIC: ${t.pic ?? 'Belum ditunjuk'}`}
                            </p>
                        </div>
                    ))}
                    <p className="border-t pt-1 text-xs text-muted-foreground">
                        {allSamePic ? 'PIC' : 'PIC temuan lain'}:{' '}
                        <span className="font-medium text-foreground">
                            {mainPic ?? 'Belum ditunjuk'}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}

function MonitoringRow({ row }: { row: Row }) {
    const { mainPic, allSamePic } = mainPicOf(row);

    return (
        <tr className={cn('align-top', !row.terisi && 'bg-danger-soft')}>
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
                                    className="font-medium text-success hover:underline"
                                >
                                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                    {row.shifts.join(', ') || 'Terisi'}
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
                                    className="h-5 border-warning/40 text-warning"
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
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                        <XCircle className="h-3.5 w-3.5" />
                        Tidak mengisi
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
                                        className="ml-1 h-4 px-1 text-xs"
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
                                                'rounded border px-1.5 py-0.5 text-xs font-medium',
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
                                {/* PIC ditulis per temuan hanya bila berbeda dari PIC utama */}
                                {((t.pic ?? null) !== mainPic ||
                                    t.target_selesai) && (
                                    <p className="mt-0.5 text-muted-foreground">
                                        {(t.pic ?? null) !== mainPic &&
                                            `PIC: ${t.pic ?? 'Belum ditunjuk'}`}
                                        {(t.pic ?? null) !== mainPic &&
                                            t.target_selesai &&
                                            ' · '}
                                        {t.target_selesai &&
                                            `Target: ${t.target_selesai}`}
                                    </p>
                                )}
                            </li>
                        ))}
                        <li className="border-t pt-1 text-xs text-muted-foreground">
                            {allSamePic ? 'PIC' : 'PIC temuan lain'}:{' '}
                            <span className="font-medium text-foreground">
                                {mainPic ?? 'Belum ditunjuk'}
                            </span>
                        </li>
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
