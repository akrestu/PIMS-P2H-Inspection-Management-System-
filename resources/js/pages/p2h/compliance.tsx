import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    RefreshCw,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PageTabs } from '@/components/page-tabs';
import { SortableHead, useClientSort } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type CellStatus = 'layak' | 'bd' | 'downtime';
type DowntimeTipe = 'BD' | 'PM' | 'Servis Berkala';

interface MatrixCell {
    // P2H fields (present when status is 'layak' or 'bd')
    session_id?: number;
    slots_filled?: number;
    total_tl?: number;
    // Downtime fields (present when status is 'downtime')
    downtime_tipe?: DowntimeTipe;
    // Always present
    status: CellStatus;
}

interface MatrixRow {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    department: string | null;
    cells: Record<string, MatrixCell | null>;
    filled_days: number;
    total_days: number;
    compliance_pct: number;
}

interface Summary {
    fleet_compliance: number;
    perfect_units: number;
    total_missed: number;
    total_bd_days: number;
    total_units: number;
    total_days: number;
}

interface Filters {
    date_from: string;
    date_to: string;
    jenis_unit?: string | null;
}

interface Props {
    matrix: MatrixRow[];
    dates: string[];
    columnSummary: Record<string, { filled: number; total: number }>;
    summary: Summary;
    filters: Filters;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtShort(d: string): string {
    const [y, m, day] = d.split('-').map(Number);

    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

function fmtLong(d: string): string {
    const [y, m, day] = d.split('-').map(Number);

    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function cellClasses(
    cell: MatrixCell | null,
    highlightMissing: boolean,
): string {
    if (cell === null) {
        return highlightMissing
            ? 'bg-danger-soft text-danger  ring-1 ring-inset ring-danger/40 '
            : 'bg-muted/40 text-muted-foreground/40';
    }

    switch (cell.status) {
        case 'layak':
            return 'bg-success-soft text-success hover:bg-success-soft    cursor-pointer';
        case 'bd':
            return 'bg-danger-soft text-danger hover:bg-danger-soft    cursor-pointer';
        case 'downtime':
            switch (cell.downtime_tipe) {
                case 'BD':
                    return 'bg-danger text-danger  ';
                case 'PM':
                    return 'bg-warning-soft text-warning  ';
                case 'Servis Berkala':
                    return 'bg-info-soft text-info  ';
                default:
                    return 'bg-muted/40 text-muted-foreground/40';
            }
    }
}

function statusLabel(cell: MatrixCell): string {
    if (cell.status === 'layak') {
        return 'Layak Pakai';
    }

    if (cell.status === 'bd') {
        return 'Breakdown (P2H)';
    }

    return `Downtime: ${cell.downtime_tipe}`;
}

function complianceColor(pct: number): string {
    if (pct >= 90) {
        return 'text-success ';
    }

    if (pct >= 70) {
        return 'text-warning ';
    }

    return 'text-danger ';
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({
    filters,
    highlightMissing,
    onToggleHighlight,
    canExport,
}: {
    filters: Filters;
    highlightMissing: boolean;
    onToggleHighlight: () => void;
    canExport: boolean;
}) {
    const [form, setForm] = useState<Filters>(filters);
    const [showPanel, setShowPanel] = useState(false);

    const applyPreset = (preset: 7 | 14 | 'month') => {
        const today = new Date();
        let from: Date;

        if (preset === 'month') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            from = new Date(today);
            from.setDate(today.getDate() - (preset - 1));
        }

        const newFilters: Filters = {
            ...form,
            date_from: from.toISOString().split('T')[0],
            date_to: today.toISOString().split('T')[0],
        };
        setForm(newFilters);
        router.get(
            '/p2h-compliance',
            { ...newFilters },
            { preserveState: true },
        );
    };

    const handleApply = () => {
        router.get('/p2h-compliance', { ...form }, { preserveState: true });
    };

    const handleReset = () => {
        const today = new Date();
        const from = new Date(today);
        from.setDate(today.getDate() - 13);
        const defaults: Filters = {
            date_from: from.toISOString().split('T')[0],
            date_to: today.toISOString().split('T')[0],
        };
        setForm(defaults);
        router.get('/p2h-compliance', { ...defaults });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    Periode:
                </span>
                {([7, 14, 'month'] as const).map((v) => (
                    <button
                        key={String(v)}
                        type="button"
                        onClick={() => applyPreset(v)}
                        className="flex h-7 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
                    >
                        {v === 7
                            ? '7 Hari'
                            : v === 14
                              ? '14 Hari'
                              : 'Bulan Ini'}
                    </button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={highlightMissing ? 'default' : 'outline'}
                        className="h-8 gap-1.5 text-xs"
                        onClick={onToggleHighlight}
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Sorot Hari Kosong
                    </Button>
                    <Button
                        size="sm"
                        variant={showPanel ? 'default' : 'outline'}
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setShowPanel((v) => !v)}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filter
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={handleReset}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset
                    </Button>
                    {/* Export hanya untuk admin/manager (route dibatasi) */}
                    {canExport && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Unduh Laporan
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/export/monitoring-p2h/pdf?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex cursor-pointer items-center gap-2"
                                    >
                                        <FileText className="h-4 w-4 text-danger" />
                                        Export PDF
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/export/monitoring-p2h/excel?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
                                        className="flex cursor-pointer items-center gap-2"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-success" />
                                        Export Excel
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {showPanel && (
                <Card className="border-primary/20">
                    <CardHeader className="pt-4 pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Filter className="h-4 w-4" />
                            Filter Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Dari Tanggal
                                </Label>
                                <Input
                                    type="date"
                                    value={form.date_from}
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
                                    value={form.date_to}
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
                                        <SelectItem value="Bus">Bus</SelectItem>
                                        <SelectItem value="Light Vehicle">
                                            Light Vehicle
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={handleReset}
                            >
                                <X className="h-4 w-4" />
                                Reset
                            </Button>
                            <Button size="sm" onClick={handleApply}>
                                Terapkan Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ── Matrix Cell ────────────────────────────────────────────────────────────────

function MatrixCellComponent({
    date,
    cell,
    highlightMissing,
}: {
    date: string;
    cell: MatrixCell | null;
    highlightMissing: boolean;
}) {
    const cellLabel =
        cell === null
            ? highlightMissing
                ? '!'
                : '–'
            : cell.status === 'downtime'
              ? cell.downtime_tipe === 'BD'
                  ? 'BD'
                  : cell.downtime_tipe === 'PM'
                    ? 'PM'
                    : 'SB'
              : `${cell.slots_filled}x`;

    const inner = (
        <div
            className={cn(
                'flex h-10 w-full items-center justify-center rounded text-xs font-semibold transition-colors select-none',
                cellClasses(cell, highlightMissing),
            )}
        >
            {cellLabel}
        </div>
    );

    if (!cell || cell.status === 'downtime') {
        return inner;
    }

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/p2h/${cell.session_id}`}
                        className="block w-full"
                    >
                        {inner}
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="space-y-1 text-xs">
                    <p className="font-semibold">{fmtLong(date)}</p>
                    <p>
                        Jumlah P2H:{' '}
                        <span className="font-bold">{cell.slots_filled}x</span>
                    </p>
                    <p>
                        Item TL:{' '}
                        <span
                            className={cn(
                                'font-bold',
                                (cell.total_tl ?? 0) > 0
                                    ? 'text-danger'
                                    : 'text-success',
                            )}
                        >
                            {cell.total_tl}
                        </span>
                    </p>
                    <p>
                        Status:{' '}
                        <span
                            className={cn(
                                'font-bold',
                                cell.status === 'layak'
                                    ? 'text-success'
                                    : 'text-danger',
                            )}
                        >
                            {statusLabel(cell)}
                        </span>
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function MatrixLegend() {
    const items = [
        {
            label: 'Layak Pakai',
            cls: 'bg-success-soft text-success  ',
        },
        {
            label: 'BD (P2H)',
            cls: 'bg-danger-soft text-danger  ',
        },
        {
            label: 'BD (Downtime)',
            cls: 'bg-danger text-danger  ',
        },
        {
            label: 'PM (Downtime)',
            cls: 'bg-warning-soft text-warning  ',
        },
        {
            label: 'Servis Berkala',
            cls: 'bg-info-soft text-info  ',
        },
        { label: 'Tidak ada P2H', cls: 'bg-muted text-muted-foreground' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="text-sm font-semibold text-foreground">
                Legenda:
            </span>
            {items.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                    <span
                        aria-hidden
                        className={cn(
                            'flex h-5 w-7 items-center justify-center rounded text-[9px] font-bold',
                            item.cls,
                        )}
                    >
                        3x
                    </span>
                    {item.label}
                </span>
            ))}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function P2hCompliancePage({
    matrix,
    dates,
    columnSummary,
    summary,
    filters,
}: Props) {
    const [highlightMissing, setHighlightMissing] = useState(false);
    const {
        rows: sortedMatrix,
        sort: matrixSort,
        onSort: onMatrixSort,
    } = useClientSort(
        matrix,
        {
            unit: (r) => r.no_unit,
            compliance: (r) => r.compliance_pct,
        },
        { by: 'unit', dir: 'asc' },
    );
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>()
        .props;
    const canExport = (auth?.user?.roles ?? []).some((r) =>
        ['admin', 'manager'].includes(r),
    );

    return (
        <>
            <Head title="Monitoring P2H — Compliance Matrix" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <PageTabs group="p2hMonitoring" />
                {/* ── Page Header ── */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                        Monitoring P2H
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Compliance matrix pengisian P2H per unit per hari ·{' '}
                        {fmtShort(filters.date_from)} –{' '}
                        {fmtShort(filters.date_to)}
                        {filters.jenis_unit ? ` · ${filters.jenis_unit}` : ''}
                    </p>
                </div>

                {/* ── Filter Bar ── */}
                <FilterBar
                    filters={filters}
                    highlightMissing={highlightMissing}
                    onToggleHighlight={() => setHighlightMissing((v) => !v)}
                    canExport={canExport}
                />

                {/* ── Legend ── */}
                <MatrixLegend />

                {/* ── Matrix Table ── */}
                {matrix.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-semibold">
                                Tidak ada unit aktif
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Coba ubah filter jenis unit.
                            </p>
                        </div>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <colgroup>
                                        <col style={{ minWidth: '160px' }} />
                                        {dates.map((d) => (
                                            <col
                                                key={d}
                                                style={{
                                                    width: '52px',
                                                    minWidth: '52px',
                                                }}
                                            />
                                        ))}
                                        <col style={{ minWidth: '108px' }} />
                                    </colgroup>

                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <SortableHead
                                                column="unit"
                                                sort={matrixSort}
                                                onSort={onMatrixSort}
                                                className="sticky left-0 z-20 border-r bg-muted/40"
                                            >
                                                Unit
                                            </SortableHead>
                                            {dates.map((d) => (
                                                <TableHead
                                                    key={d}
                                                    className="px-1 py-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
                                                >
                                                    {fmtShort(d)}
                                                </TableHead>
                                            ))}
                                            <SortableHead
                                                column="compliance"
                                                descFirst
                                                sort={matrixSort}
                                                onSort={onMatrixSort}
                                                className="sticky right-0 z-20 border-l bg-muted/40 text-center"
                                            >
                                                Compliance
                                            </SortableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {sortedMatrix.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                className="hover:bg-muted/10"
                                            >
                                                {/* Unit cell — frozen left */}
                                                <TableCell className="sticky left-0 z-10 border-r bg-background px-3 py-2">
                                                    <p className="text-sm leading-tight font-semibold">
                                                        {row.no_unit}
                                                    </p>
                                                    <div className="mt-0.5 flex items-center gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'h-4 px-1 text-[9px]',
                                                                row.jenis_unit ===
                                                                    'Bus'
                                                                    ? 'border-info/40 bg-info-soft text-info'
                                                                    : 'border-info/40 bg-info-soft text-info',
                                                            )}
                                                        >
                                                            {row.jenis_unit ===
                                                            'Bus'
                                                                ? 'Bus'
                                                                : 'LV'}
                                                        </Badge>
                                                        {row.no_lambung && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {row.no_lambung}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Date cells */}
                                                {dates.map((d) => (
                                                    <TableCell
                                                        key={d}
                                                        className="px-1 py-1"
                                                    >
                                                        <MatrixCellComponent
                                                            date={d}
                                                            cell={
                                                                row.cells[d] ??
                                                                null
                                                            }
                                                            highlightMissing={
                                                                highlightMissing
                                                            }
                                                        />
                                                    </TableCell>
                                                ))}

                                                {/* Compliance summary — frozen right */}
                                                <TableCell className="sticky right-0 z-10 border-l bg-background px-3 text-center">
                                                    <p
                                                        className={cn(
                                                            'text-sm font-bold tabular-nums',
                                                            complianceColor(
                                                                row.compliance_pct,
                                                            ),
                                                        )}
                                                    >
                                                        {row.compliance_pct}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {row.filled_days}/
                                                        {row.total_days}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>

                                    <TableFooter>
                                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                                            <TableCell className="sticky left-0 z-10 border-r bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
                                                Total
                                            </TableCell>
                                            {dates.map((d) => {
                                                const col = columnSummary[d];
                                                const pct =
                                                    col.total > 0
                                                        ? Math.round(
                                                              (col.filled /
                                                                  col.total) *
                                                                  100,
                                                          )
                                                        : 0;

                                                return (
                                                    <TableCell
                                                        key={d}
                                                        className="px-1 py-2 text-center"
                                                    >
                                                        <p
                                                            className={cn(
                                                                'text-xs font-bold tabular-nums',
                                                                complianceColor(
                                                                    pct,
                                                                ),
                                                            )}
                                                        >
                                                            {col.filled}/
                                                            {col.total}
                                                        </p>
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="sticky right-0 z-10 border-l bg-muted/20 px-3 text-center">
                                                <p
                                                    className={cn(
                                                        'text-sm font-bold tabular-nums',
                                                        complianceColor(
                                                            summary.fleet_compliance,
                                                        ),
                                                    )}
                                                >
                                                    {summary.fleet_compliance}%
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Info Footer ── */}
                <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                    <p>
                        <strong className="text-foreground">Cara baca:</strong>{' '}
                        Setiap sel menunjukkan apakah unit mengisi P2H pada
                        tanggal tersebut. Angka dalam sel adalah jumlah
                        pengisian P2H pada hari tersebut. Klik sel untuk melihat
                        detail sesi P2H.
                    </p>
                    <p>
                        Status{' '}
                        <strong className="text-success">Layak Pakai</strong> =
                        semua slot dengan kondisi_akhir Layak Pakai atau score ≥
                        80%. Status{' '}
                        <strong className="text-danger">Breakdown</strong> = ada
                        satu atau lebih slot kondisi BD. Range maksimal{' '}
                        <strong className="text-foreground">31 hari</strong>.
                    </p>
                </div>
            </div>
        </>
    );
}

P2hCompliancePage.layout = {
    breadcrumbs: [{ title: 'Monitoring P2H', href: '/p2h-compliance' }],
};
