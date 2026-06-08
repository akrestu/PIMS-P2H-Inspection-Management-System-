import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type CellStatus = 'layak' | 'bd';

interface MatrixCell {
    session_id: number;
    slots_filled: number;
    total_tl: number;
    status: CellStatus;
}

interface MatrixRow {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
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
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function fmtLong(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    });
}

function cellClasses(status: CellStatus | null, highlightMissing: boolean): string {
    if (status === null) {
        return highlightMissing
            ? 'bg-red-50 text-red-400 dark:bg-red-950/20 ring-1 ring-inset ring-red-200 dark:ring-red-800'
            : 'bg-muted/40 text-muted-foreground/40';
    }
    switch (status) {
        case 'layak':
            return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60 cursor-pointer';
        case 'bd':
            return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 cursor-pointer';
    }
}

function statusLabel(status: CellStatus): string {
    return status === 'layak' ? 'Layak Pakai' : 'Breakdown';
}

function complianceColor(pct: number): string {
    if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

// ── Summary Cards ──────────────────────────────────────────────────────────────

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({
    filters,
    highlightMissing,
    onToggleHighlight,
}: {
    filters: Filters;
    highlightMissing: boolean;
    onToggleHighlight: () => void;
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
        router.get('/p2h-compliance', newFilters, { preserveState: true });
    };

    const handleApply = () => {
        router.get('/p2h-compliance', form, { preserveState: true });
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
        router.get('/p2h-compliance', defaults);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Periode:</span>
                {([7, 14, 'month'] as const).map((v) => (
                    <button
                        key={String(v)}
                        type="button"
                        onClick={() => applyPreset(v)}
                        className="flex h-7 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
                    >
                        {v === 7 ? '7 Hari' : v === 14 ? '14 Hari' : 'Bulan Ini'}
                    </button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={highlightMissing ? 'default' : 'outline'}
                        className="gap-1.5 h-8 text-xs"
                        onClick={onToggleHighlight}
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Sorot Hari Kosong
                    </Button>
                    <Button
                        size="sm"
                        variant={showPanel ? 'default' : 'outline'}
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => setShowPanel((v) => !v)}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filter
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs"
                        onClick={handleReset}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                                <Download className="h-3.5 w-3.5" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Unduh Laporan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <a
                                    href={`/export/monitoring-p2h/pdf?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <FileText className="h-4 w-4 text-red-500" />
                                    Export PDF
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a
                                    href={`/export/monitoring-p2h/excel?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                    Export Excel
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {showPanel && (
                <Card className="border-primary/20">
                    <CardHeader className="pb-3 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filter Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
                                <Input
                                    type="date"
                                    value={form.date_from}
                                    onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
                                <Input
                                    type="date"
                                    value={form.date_to}
                                    onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Jenis Unit</Label>
                                <Select
                                    value={form.jenis_unit ?? 'all'}
                                    onValueChange={(v) => setForm({ ...form, jenis_unit: v === 'all' ? undefined : v })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Semua jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua jenis</SelectItem>
                                        <SelectItem value="Bus">Bus</SelectItem>
                                        <SelectItem value="Light Vehicle">Light Vehicle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
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
    const inner = (
        <div
            className={cn(
                'flex h-10 w-full items-center justify-center rounded text-xs font-semibold transition-colors select-none',
                cellClasses(cell?.status ?? null, highlightMissing),
            )}
        >
            {cell ? `${cell.slots_filled}x` : highlightMissing ? '!' : '–'}
        </div>
    );

    if (!cell) return inner;

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={`/p2h/${cell.session_id}`} className="block w-full">
                        {inner}
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs space-y-1">
                    <p className="font-semibold">{fmtLong(date)}</p>
                    <p>
                        Jumlah P2H:{' '}
                        <span className="font-bold">{cell.slots_filled}x</span>
                    </p>
                    <p>
                        Item TL:{' '}
                        <span className={cn('font-bold', cell.total_tl > 0 ? 'text-red-400' : 'text-emerald-400')}>
                            {cell.total_tl}
                        </span>
                    </p>
                    <p>
                        Status:{' '}
                        <span className={cn(
                            'font-bold',
                            cell.status === 'layak' ? 'text-emerald-400' : 'text-red-400',
                        )}>
                            {statusLabel(cell.status)}
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
        { label: 'Layak Pakai', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
        { label: 'Breakdown', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
        { label: 'Tidak ada P2H', cls: 'bg-muted/40 text-muted-foreground/40' },
    ];
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground text-sm">Legenda:</span>
            {items.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                    <span className={cn('h-5 w-7 rounded text-[9px] font-bold flex items-center justify-center', item.cls)}>
                        3x
                    </span>
                    {item.label}
                </span>
            ))}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function P2hCompliancePage({ matrix, dates, columnSummary, summary, filters }: Props) {
    const [highlightMissing, setHighlightMissing] = useState(false);

    return (
        <>
            <Head title="Monitoring P2H — Compliance Matrix" />
            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold md:text-2xl flex items-center gap-2">
                        <CalendarCheck className="h-6 w-6 text-primary" />
                        Monitoring P2H
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Compliance matrix pengisian P2H per unit per hari ·{' '}
                        {fmtShort(filters.date_from)} – {fmtShort(filters.date_to)}
                        {filters.jenis_unit ? ` · ${filters.jenis_unit}` : ''}
                    </p>
                </div>

                {/* ── Filter Bar ── */}
                <FilterBar
                    filters={filters}
                    highlightMissing={highlightMissing}
                    onToggleHighlight={() => setHighlightMissing((v) => !v)}
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
                            <p className="text-base font-semibold">Tidak ada unit aktif</p>
                            <p className="text-sm text-muted-foreground">Coba ubah filter jenis unit.</p>
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
                                            <col key={d} style={{ width: '52px', minWidth: '52px' }} />
                                        ))}
                                        <col style={{ minWidth: '108px' }} />
                                    </colgroup>

                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="sticky left-0 z-20 bg-muted/40 border-r">
                                                Unit
                                            </TableHead>
                                            {dates.map((d) => (
                                                <TableHead
                                                    key={d}
                                                    className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                                                >
                                                    {fmtShort(d)}
                                                </TableHead>
                                            ))}
                                            <TableHead className="sticky right-0 z-20 bg-muted/40 border-l text-center">
                                                Compliance
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {matrix.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-muted/10">
                                                {/* Unit cell — frozen left */}
                                                <TableCell className="sticky left-0 z-10 bg-background border-r py-2 px-3">
                                                    <p className="font-semibold text-sm leading-tight">{row.no_unit}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'text-[9px] h-4 px-1',
                                                                row.jenis_unit === 'Bus'
                                                                    ? 'border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                                                                    : 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                                                            )}
                                                        >
                                                            {row.jenis_unit === 'Bus' ? 'Bus' : 'LV'}
                                                        </Badge>
                                                        {row.no_lambung && (
                                                            <span className="text-[10px] text-muted-foreground">{row.no_lambung}</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Date cells */}
                                                {dates.map((d) => (
                                                    <TableCell key={d} className="px-1 py-1">
                                                        <MatrixCellComponent
                                                            date={d}
                                                            cell={row.cells[d] ?? null}
                                                            highlightMissing={highlightMissing}
                                                        />
                                                    </TableCell>
                                                ))}

                                                {/* Compliance summary — frozen right */}
                                                <TableCell className="sticky right-0 z-10 bg-background border-l text-center px-3">
                                                    <p className={cn('text-sm font-bold tabular-nums', complianceColor(row.compliance_pct))}>
                                                        {row.compliance_pct}%
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {row.filled_days}/{row.total_days}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>

                                    <TableFooter>
                                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                                            <TableCell className="sticky left-0 z-10 bg-muted/20 border-r px-3 text-xs font-semibold text-muted-foreground">
                                                Total
                                            </TableCell>
                                            {dates.map((d) => {
                                                const col = columnSummary[d];
                                                const pct = col.total > 0
                                                    ? Math.round((col.filled / col.total) * 100)
                                                    : 0;
                                                return (
                                                    <TableCell key={d} className="px-1 py-2 text-center">
                                                        <p className={cn('text-[10px] font-bold tabular-nums', complianceColor(pct))}>
                                                            {col.filled}/{col.total}
                                                        </p>
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="sticky right-0 z-10 bg-muted/20 border-l text-center px-3">
                                                <p className={cn('text-sm font-bold tabular-nums', complianceColor(summary.fleet_compliance))}>
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
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p>
                        <strong className="text-foreground">Cara baca:</strong>{' '}
                        Setiap sel menunjukkan apakah unit mengisi P2H pada tanggal tersebut.
                        Angka dalam sel adalah jumlah pengisian P2H pada hari tersebut.
                        Klik sel untuk melihat detail sesi P2H.
                    </p>
                    <p>
                        Status <strong className="text-emerald-600 dark:text-emerald-400">Layak Pakai</strong> = semua slot dengan kondisi_akhir Layak Pakai atau score ≥ 80%.{' '}
                        Status <strong className="text-red-600 dark:text-red-400">Breakdown</strong> = ada satu atau lebih slot kondisi BD.{' '}
                        Range maksimal <strong className="text-foreground">31 hari</strong>.
                    </p>
                </div>
            </div>
        </>
    );
}

P2hCompliancePage.layout = {
    breadcrumbs: [{ title: 'Monitoring P2H', href: '/p2h-compliance' }],
};
