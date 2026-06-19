import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Bus,
    CalendarDays,
    Car,
    CheckCircle2,
    Clock,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    MessageCircle,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    WrenchIcon,
    X,
} from 'lucide-react';
import { useWhatsAppShare } from '@/hooks/use-whatsapp-share';
import { formatPaReport } from '@/lib/whatsapp-formatters';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineDay {
    date: string;
    score: number | null;
    status: 'operation' | 'bd' | 'no_data';
    has_override: boolean;
}

interface UnitPA {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    compliance_pa: number | null;
    actual_pa: number | null;
    working_hours: number;
    downtime_hours: number;
    has_time_data: boolean;
    current_score: number | null;
    current_status: 'operation' | 'bd' | 'no_data';
    latest_date: string | null;
    total_sessions: number;
    total_days: number;
    operation_days: number;
    bd_days: number;
    total_tl: number;
    timeline: TimelineDay[];
}

interface Summary {
    fleet_compliance_pa: number | null;
    fleet_actual_pa: number | null;
    total_units: number;
    operation_count: number;
    bd_count: number;
    no_data_count: number;
    units_with_time_data: number;
    pa_threshold: number;
    shift_hours: number;
}

interface Filters {
    date_from: string;
    date_to: string;
    unit_id?: string;
    jenis_unit?: string;
}

interface UnitOption {
    id: number;
    no_unit: string;
    jenis_unit: string;
}

interface Props {
    unitData: UnitPA[];
    summary: Summary;
    filters: Filters;
    allUnits: UnitOption[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function paColor(pa: number | null): string {
    if (pa === null) return 'text-muted-foreground';
    if (pa >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (pa >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function progressColor(pa: number | null): string {
    if (pa === null) return 'bg-muted';
    if (pa >= 90) return '[&>div]:bg-emerald-500';
    if (pa >= 75) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
}

function statusConfig(status: UnitPA['current_status']) {
    switch (status) {
        case 'operation':
            return {
                label: 'Operation',
                icon: CheckCircle2,
                badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
                dotClass: 'bg-emerald-500',
            };
        case 'bd':
            return {
                label: 'Breakdown',
                icon: WrenchIcon,
                badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
                dotClass: 'bg-red-500',
            };
        default:
            return {
                label: 'No Data',
                icon: Activity,
                badgeClass: 'bg-muted text-muted-foreground border-border',
                dotClass: 'bg-muted-foreground',
            };
    }
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateShort(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ── Timeline Sparkline ─────────────────────────────────────────────────────────

function TimelineSparkline({ timeline }: { timeline: TimelineDay[] }) {
    const MAX_DOTS = 30;
    const visible = timeline.slice(-MAX_DOTS);

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-px">
                {visible.map((day) => {
                    const colorClass =
                        day.status === 'operation'
                            ? 'bg-emerald-500'
                            : day.status === 'bd'
                              ? 'bg-red-500'
                              : 'bg-muted';

                    return (
                        <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        'h-5 w-2 rounded-sm cursor-default transition-opacity hover:opacity-80 relative',
                                        colorClass,
                                        day.has_override && 'ring-1 ring-amber-400 ring-offset-0',
                                    )}
                                >
                                    {day.has_override && (
                                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">{formatDateShort(day.date)}</p>
                                {day.score !== null ? (
                                    <>
                                        <p>
                                            Kelayakan:{' '}
                                            <span className={day.score >= 80 ? 'text-emerald-400' : 'text-red-400'}>
                                                {day.score}%
                                            </span>
                                        </p>
                                        <p>
                                            Status:{' '}
                                            <span className={day.status === 'operation' ? 'text-emerald-400' : 'text-red-400'}>
                                                {day.status === 'operation' ? 'Operation' : 'Breakdown'}
                                            </span>
                                            {day.has_override && (
                                                <span className="ml-1 text-amber-400">(Override)</span>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Tidak ada P2H</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}

// ── Summary Cards ──────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: Summary }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* PA Aktual Fleet */}
            <Card className="border-2 border-primary/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">PA Aktual Fleet</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                    <p className={cn('text-3xl font-bold tabular-nums', paColor(summary.fleet_actual_pa))}>
                        {summary.fleet_actual_pa !== null ? `${summary.fleet_actual_pa}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        W÷(W+S) · {summary.units_with_time_data} unit
                    </p>
                    {summary.fleet_actual_pa !== null && (
                        <div className="mt-2 flex items-center gap-1.5">
                            {summary.fleet_actual_pa >= 90 ? (
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            ) : summary.fleet_actual_pa >= 75 ? (
                                <Activity className="h-3.5 w-3.5 text-yellow-500" />
                            ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span className={cn('text-xs font-medium', paColor(summary.fleet_actual_pa))}>
                                {summary.fleet_actual_pa >= 90 ? 'Sangat Baik' : summary.fleet_actual_pa >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Kelayakan P2H Fleet */}
            <Card className="border-2">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Kelayakan P2H</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className={cn('text-3xl font-bold tabular-nums', paColor(summary.fleet_compliance_pa))}>
                        {summary.fleet_compliance_pa !== null ? `${summary.fleet_compliance_pa}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Rata-rata compliance P2H
                    </p>
                </CardContent>
            </Card>

            {/* Operation */}
            <Card className="border-2 border-emerald-200 dark:border-emerald-900">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Operation</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {summary.operation_count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">unit beroperasi normal</p>
                </CardContent>
            </Card>

            {/* BD */}
            <Card className="border-2 border-red-200 dark:border-red-900">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Breakdown</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
                            <WrenchIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {summary.bd_count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">unit terdeteksi masalah</p>
                </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-2">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Total Unit</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                            <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold tabular-nums">{summary.total_units}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {summary.no_data_count > 0 ? `${summary.no_data_count} belum ada data` : 'semua unit aktif'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Unit PA Card ───────────────────────────────────────────────────────────────

function UnitPACard({ unit, paThreshold }: { unit: UnitPA; paThreshold: number }) {
    const status = statusConfig(unit.current_status);
    const StatusIcon = status.icon;
    const isLV = unit.jenis_unit === 'Light Vehicle';

    return (
        <Card className={cn(
            'border-2 transition-all duration-150 hover:shadow-md',
            unit.current_status === 'bd' && 'border-red-200 dark:border-red-900',
            unit.current_status === 'operation' && 'border-emerald-100 dark:border-emerald-900/50',
        )}>
            <CardContent className="p-4 space-y-4">

                {/* ── Header Row ── */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            isLV ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-purple-100 dark:bg-purple-950/40',
                        )}>
                            {isLV
                                ? <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                : <Bus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            }
                        </div>
                        <div>
                            <p className="text-base font-bold leading-tight">{unit.no_unit}</p>
                            <p className="text-xs text-muted-foreground">
                                {unit.jenis_unit}{unit.no_lambung ? ` · ${unit.no_lambung}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                        variant="outline"
                        className={cn('gap-1 text-xs font-semibold', status.badgeClass)}
                    >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                </div>

                {/* ── PA Aktual (primary) ── */}
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">PA Aktual</span>
                        {unit.has_time_data ? (
                            <span className={cn('text-lg font-bold tabular-nums', paColor(unit.actual_pa))}>
                                {unit.actual_pa !== null ? `${unit.actual_pa}%` : '—'}
                            </span>
                        ) : (
                            <span className="text-lg font-bold tabular-nums text-muted-foreground">—</span>
                        )}
                    </div>
                    {unit.has_time_data ? (
                        <Progress
                            value={unit.actual_pa ?? 0}
                            className={cn('h-2', progressColor(unit.actual_pa))}
                        />
                    ) : (
                        <div className="h-2 rounded-full bg-muted" />
                    )}
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        {unit.has_time_data ? (
                            <>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    W: {unit.working_hours}j · BD: {unit.downtime_hours}j
                                </span>
                                <span>W÷(W+S)×100</span>
                            </>
                        ) : (
                            <span className="italic">Belum ada data shift</span>
                        )}
                    </div>
                </div>

                {/* ── Kelayakan P2H (secondary) ── */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Kelayakan P2H</span>
                    <div className="flex items-center gap-1.5">
                        {unit.compliance_pa !== null ? (
                            <>
                                <div className={cn(
                                    'h-2 w-2 rounded-full',
                                    unit.compliance_pa >= paThreshold ? 'bg-emerald-500' : 'bg-red-500',
                                )} />
                                <span className={cn('text-sm font-bold tabular-nums', paColor(unit.compliance_pa))}>
                                    {unit.compliance_pa}%
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                        )}
                    </div>
                </div>

                {/* ── Timeline Sparkline ── */}
                <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Riwayat Harian
                    </p>
                    {unit.timeline.length > 0 ? (
                        <TimelineSparkline timeline={unit.timeline} />
                    ) : (
                        <p className="text-xs text-muted-foreground italic">Belum ada data</p>
                    )}
                </div>

                {/* ── Footer Stats ── */}
                <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {unit.total_tl > 0 && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {unit.total_tl} item TL
                            </span>
                        )}
                        {unit.latest_date && (
                            <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                P2H: {formatDate(unit.latest_date)}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {unit.operation_days}O/{unit.bd_days}BD
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ threshold }: { threshold: number }) {
    return (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground text-sm">Legenda:</span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                Operation
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-red-500" />
                Breakdown
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-muted border" />
                Tidak ada P2H
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-500 ring-1 ring-amber-400" />
                Override keputusan operator
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>
                <strong className="text-foreground">PA Aktual</strong> = W ÷ (W + S) × 100% ·{' '}
                Threshold kelayakan: <strong className="text-foreground">{threshold}%</strong>
            </span>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MonitoringIndex({ unitData, summary, filters, allUnits }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[]; jabatan?: string } | null } }>().props;
    const roles    = auth?.user?.roles ?? [];
    const jabatan  = auth?.user?.jabatan ?? '';
    const isAdminOrManager = roles.includes('admin') || roles.includes('manager');
    const isStaffDriver    = !isAdminOrManager && (jabatan === 'Staff' || jabatan === 'Sr.Staff');

    const [form, setForm] = useState(filters);
    const { share } = useWhatsAppShare();
    const handleShareWhatsApp = () => share(formatPaReport(unitData, summary, filters));
    const [sortBy, setSortBy] = useState<'actual_asc' | 'actual_desc' | 'name' | 'status'>('actual_asc');
    const [showFilter, setShowFilter] = useState(false);

    const handleApply = () => {
        router.get('/monitoring', form, { preserveState: true });
    };

    const handleReset = () => {
        const defaults = {
            date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0],
        };
        setForm(defaults);
        router.get('/monitoring', defaults);
    };

    // Quick range presets
    const applyPreset = (preset: 'today' | 'week' | 'month' | 'last_month') => {
        const today = new Date();
        let from: Date, to: Date;
        switch (preset) {
            case 'today':
                from = to = today;
                break;
            case 'week':
                from = new Date(today);
                from.setDate(today.getDate() - 6);
                to = today;
                break;
            case 'last_month':
                from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                to = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default: // month
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = today;
        }
        const newFilters = {
            ...form,
            date_from: from.toISOString().split('T')[0],
            date_to: to.toISOString().split('T')[0],
        };
        setForm(newFilters);
        router.get('/monitoring', newFilters, { preserveState: true });
    };

    // Sort
    const sorted = [...unitData].sort((a, b) => {
        switch (sortBy) {
            case 'actual_asc':
                return (a.actual_pa ?? -1) - (b.actual_pa ?? -1);
            case 'actual_desc':
                return (b.actual_pa ?? -1) - (a.actual_pa ?? -1);
            case 'status': {
                const order = { bd: 0, no_data: 1, operation: 2 };
                return order[a.current_status] - order[b.current_status];
            }
            default:
                return a.no_unit.localeCompare(b.no_unit);
        }
    });

    const PRESETS = [
        { label: 'Hari Ini', value: 'today' as const },
        { label: '7 Hari', value: 'week' as const },
        { label: 'Bulan Ini', value: 'month' as const },
        { label: 'Bulan Lalu', value: 'last_month' as const },
    ];

    return (
        <>
            <Head title="Monitoring PA" />
            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold md:text-2xl flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-primary" />
                            Monitoring PA
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Physical Availability unit ·{' '}
                            {formatDate(filters.date_from)} – {formatDate(filters.date_to)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilter ? 'default' : 'outline'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                            <RefreshCw className="h-4 w-4" />
                            Reset
                        </Button>
                        {!isStaffDriver && <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Unduh Laporan</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/export/monitoring-pa/pdf?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
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
                                        href={`/export/monitoring-pa/excel?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        Export Excel
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={handleShareWhatsApp}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <MessageCircle className="h-4 w-4 text-green-500" />
                                    Bagikan via WhatsApp
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>}
                    </div>
                </div>

                {/* ── Quick Presets ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Periode:</span>
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => applyPreset(p.value)}
                            className="flex h-7 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* ── Filter Panel ── */}
                {showFilter && (
                    <Card className="border-primary/20">
                        <CardHeader className="pb-3 pt-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filter Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                                    <Label className="text-xs text-muted-foreground">Unit</Label>
                                    <Select
                                        value={form.unit_id ?? 'all'}
                                        onValueChange={(v) => setForm({ ...form, unit_id: v === 'all' ? undefined : v })}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Semua unit" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua unit</SelectItem>
                                            {allUnits.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>
                                                    {u.no_unit} ({u.jenis_unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {!isStaffDriver && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Jenis Unit</Label>
                                        <Select
                                            value={form.jenis_unit ?? 'all'}
                                            onValueChange={(v) => setForm({ ...form, jenis_unit: v === 'all' ? undefined : v })}
                                        >
                                            <SelectTrigger className="h-10"><SelectValue placeholder="Semua jenis" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua jenis</SelectItem>
                                                <SelectItem value="Bus">Bus</SelectItem>
                                                <SelectItem value="Light Vehicle">Light Vehicle</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                                    <X className="h-4 w-4" /> Reset
                                </Button>
                                <Button size="sm" className="gap-2" onClick={handleApply}>
                                    Terapkan Filter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Summary Cards ── */}
                <SummaryCards summary={summary} />

                {/* ── Legend ── */}
                <Legend threshold={summary.pa_threshold} />

                {/* ── Sort & Count ── */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {unitData.length} unit aktif
                    </p>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Urutkan:</Label>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                            <SelectTrigger className="h-8 w-44 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="actual_asc">PA Aktual Terendah</SelectItem>
                                <SelectItem value="actual_desc">PA Aktual Tertinggi</SelectItem>
                                <SelectItem value="status">Status (BD dahulu)</SelectItem>
                                <SelectItem value="name">No. Unit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ── Unit Cards Grid ── */}
                {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-semibold">Tidak ada unit ditemukan</p>
                            <p className="text-sm text-muted-foreground">Coba ubah filter pencarian.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sorted.map((unit) => (
                            <UnitPACard key={unit.id} unit={unit} paThreshold={summary.pa_threshold} />
                        ))}
                    </div>
                )}

                {/* ── Info Footer ── */}
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p>
                        <strong className="text-foreground">PA Aktual</strong> = W ÷ (W + S) × 100% — di mana{' '}
                        <strong className="text-foreground">W</strong> (Working Hours) dihitung otomatis dari jumlah shift P2H × {summary.shift_hours} jam, dan{' '}
                        <strong className="text-foreground">S</strong> (Service Hours) dari log downtime yang dicatat di halaman Downtime Log.
                    </p>
                    <p>
                        <strong className="text-foreground">Kelayakan P2H</strong> adalah % hari unit beroperasi normal berdasarkan checklist P2H (score ≥ {summary.pa_threshold}%). Operator dapat override status unit via keputusan akhir P2H.
                    </p>
                </div>
            </div>
        </>
    );
}

MonitoringIndex.layout = {
    breadcrumbs: [{ title: 'Monitoring PA', href: '/monitoring' }],
};
