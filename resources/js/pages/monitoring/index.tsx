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
    RefreshCw,
    WrenchIcon,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PageTabs } from '@/components/page-tabs';
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
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineDay {
    date: string;
    score: number | null;
    status: 'operation' | 'bd' | 'no_data';
    has_override: boolean;
    downtime_tipe?: 'BD' | 'PM' | 'Servis Berkala' | null;
}

interface UnitPA {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    department: string | null;
    actual_pa: number | null;
    calendar_hours: number;
    working_hours: number;
    downtime_hours: number;
    has_time_data: boolean;
    current_status: 'operation' | 'bd' | 'no_data';
    downtime_tipe: 'BD' | 'PM' | 'Servis Berkala' | null;
    downtime_since: string | null;
    latest_date: string | null;
    total_sessions: number;
    total_days: number;
    operation_days: number;
    bd_days: number;
    total_tl: number;
    timeline: TimelineDay[];
}

interface Summary {
    fleet_actual_pa: number | null;
    pa_by_jenis: Record<
        string,
        { pa: number | null; total: number; bd: number }
    >;
    total_units: number;
    operation_count: number;
    bd_count: number;
    no_data_count: number;
    units_with_time_data: number;
    pa_threshold: number;
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
    if (pa === null) {
        return 'text-muted-foreground';
    }

    if (pa >= 90) {
        return 'text-success ';
    }

    if (pa >= 75) {
        return 'text-warning ';
    }

    return 'text-danger ';
}

function progressColor(pa: number | null): string {
    if (pa === null) {
        return 'bg-muted';
    }

    if (pa >= 90) {
        return '[&>div]:bg-success';
    }

    if (pa >= 75) {
        return '[&>div]:bg-warning';
    }

    return '[&>div]:bg-danger';
}

function statusConfig(status: UnitPA['current_status']) {
    switch (status) {
        case 'operation':
            return {
                label: 'Ready',
                icon: CheckCircle2,
                badgeClass: 'bg-success-soft text-success border-success/40   ',
                dotClass: 'bg-success',
            };
        case 'bd':
            return {
                label: 'Breakdown',
                icon: WrenchIcon,
                badgeClass: 'bg-danger-soft text-danger border-danger/40   ',
                dotClass: 'bg-danger',
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
    return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

// ── Timeline Sparkline ─────────────────────────────────────────────────────────

function TimelineSparkline({ timeline }: { timeline: TimelineDay[] }) {
    const MAX_DOTS = 30;
    const visible = timeline.slice(-MAX_DOTS);

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-px">
                {visible.map((day) => {
                    // Downtime tanpa P2H: warna khusus sesuai tipe
                    const isDowntimeOnly =
                        day.status === 'bd' && day.downtime_tipe != null;
                    const colorClass =
                        day.status === 'operation'
                            ? 'bg-success'
                            : day.status === 'bd'
                              ? isDowntimeOnly
                                  ? day.downtime_tipe === 'PM'
                                      ? 'bg-info'
                                      : day.downtime_tipe === 'Servis Berkala'
                                        ? 'bg-info'
                                        : 'bg-warning' // BD downtime
                                  : 'bg-danger' // BD dari P2H
                              : 'bg-muted';

                    return (
                        <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        'relative h-5 w-2 cursor-default rounded-sm transition-opacity hover:opacity-80',
                                        colorClass,
                                        day.has_override &&
                                            'ring-1 ring-warning ring-offset-0',
                                    )}
                                >
                                    {day.has_override && (
                                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-warning" />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">
                                    {formatDateShort(day.date)}
                                </p>
                                {day.downtime_tipe != null ? (
                                    <p className="text-warning">
                                        Downtime: {day.downtime_tipe}
                                    </p>
                                ) : day.score !== null ? (
                                    <>
                                        <p>
                                            Kelayakan:{' '}
                                            <span
                                                className={
                                                    day.score >= 80
                                                        ? 'text-success'
                                                        : 'text-danger'
                                                }
                                            >
                                                {day.score}%
                                            </span>
                                        </p>
                                        <p>
                                            Status:{' '}
                                            <span
                                                className={
                                                    day.status === 'operation'
                                                        ? 'text-success'
                                                        : 'text-danger'
                                                }
                                            >
                                                {day.status === 'operation'
                                                    ? 'Ready'
                                                    : 'Breakdown'}
                                            </span>
                                            {day.has_override && (
                                                <span className="ml-1 text-warning">
                                                    (Override)
                                                </span>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">
                                        Tidak ada P2H
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}

// ── Unit PA Card ───────────────────────────────────────────────────────────────

function UnitPACard({ unit }: { unit: UnitPA }) {
    const status = statusConfig(unit.current_status);
    const StatusIcon = status.icon;
    const isLV = unit.jenis_unit === 'Light Vehicle';

    return (
        <Card
            className={cn(
                'border-2 transition-all duration-150 hover:shadow-md',
                unit.current_status === 'bd' && 'border-danger/40',
                unit.current_status === 'operation' && 'border-success/40',
            )}
        >
            <CardContent className="space-y-4 p-4">
                {/* ── Header Row ── */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                isLV ? 'bg-info-soft' : 'bg-info-soft',
                            )}
                        >
                            {isLV ? (
                                <Car className="h-5 w-5 text-info" />
                            ) : (
                                <Bus className="h-5 w-5 text-info" />
                            )}
                        </div>
                        <div>
                            <p className="text-base leading-tight font-bold">
                                {unit.no_unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {unit.jenis_unit}
                                {unit.no_lambung ? ` · ${unit.no_lambung}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                        variant="outline"
                        className={cn(
                            'gap-1 text-xs font-semibold',
                            status.badgeClass,
                        )}
                    >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                </div>

                {/* ── PA Aktual (primary) ── */}
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                            PA Aktual
                        </span>
                        {unit.has_time_data ? (
                            <span
                                className={cn(
                                    'text-lg font-bold tabular-nums',
                                    paColor(unit.actual_pa),
                                )}
                            >
                                {unit.actual_pa !== null
                                    ? `${unit.actual_pa}%`
                                    : '—'}
                            </span>
                        ) : (
                            <span className="text-lg font-bold text-muted-foreground tabular-nums">
                                —
                            </span>
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
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        {unit.has_time_data ? (
                            <>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Tersedia {unit.working_hours}j · Downtime{' '}
                                    {unit.downtime_hours}j
                                </span>
                                <span>(T−S)÷T</span>
                            </>
                        ) : (
                            <span className="italic">Belum ada data</span>
                        )}
                    </div>
                </div>

                {/* ── Downtime berjalan (sumber status unit) ── */}
                {unit.downtime_tipe && (
                    <div className="flex items-center justify-between rounded-lg bg-danger-soft px-3 py-2 text-xs">
                        <span className="font-medium text-danger">
                            {unit.downtime_tipe} berjalan
                        </span>
                        {unit.downtime_since && (
                            <span className="text-muted-foreground">
                                sejak {unit.downtime_since}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Timeline Sparkline ── */}
                <div>
                    <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Riwayat Harian
                    </p>
                    {unit.timeline.length > 0 ? (
                        <TimelineSparkline timeline={unit.timeline} />
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            Belum ada data
                        </p>
                    )}
                </div>

                {/* ── Footer Stats ── */}
                <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {unit.total_tl > 0 && (
                            <span className="flex items-center gap-1 text-danger">
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
                    <span className="text-xs text-muted-foreground">
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
            <span className="text-sm font-semibold text-foreground">
                Legenda:
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-success" />
                Operation
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-danger" />
                BD (P2H)
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-warning" />
                BD (Downtime)
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-info" />
                PM (Downtime)
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-info" />
                Servis Berkala
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm border bg-muted" />
                Tidak ada P2H
            </span>
            <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-success ring-1 ring-warning" />
                Override keputusan operator
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>
                <strong className="text-foreground">PA Aktual</strong> = W ÷ (W
                + S) × 100% · Threshold kelayakan:{' '}
                <strong className="text-foreground">{threshold}%</strong>
            </span>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MonitoringIndex({
    unitData,
    summary,
    filters,
    allUnits,
}: Props) {
    const { auth } = usePage<{
        auth: { user: { roles: string[]; can_monitor?: boolean } | null };
    }>().props;
    const roles = auth?.user?.roles ?? [];
    const isAdminOrManager =
        roles.includes('admin') || roles.includes('manager');
    const isStaffDriver = !isAdminOrManager && !!auth?.user?.can_monitor;

    const [form, setForm] = useState(filters);
    const [sortBy, setSortBy] = useState<
        'actual_asc' | 'actual_desc' | 'name' | 'status'
    >('actual_asc');
    const [showFilter, setShowFilter] = useState(false);

    const handleApply = () => {
        router.get('/monitoring', { ...form }, { preserveState: true });
    };

    const handleReset = () => {
        const defaults = {
            date_from: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1,
            )
                .toISOString()
                .split('T')[0],
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
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <PageTabs group="unitPerformance" />
                {/* ── Page Header ── */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                            Monitoring PA
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Physical Availability unit ·{' '}
                            {formatDate(filters.date_from)} –{' '}
                            {formatDate(filters.date_to)}
                        </p>
                        <p className="mt-1 text-sm">
                            {Object.entries(summary.pa_by_jenis).map(
                                ([jenis, g], i) => (
                                    <span key={jenis}>
                                        {i > 0 && ' · '}
                                        PA {jenis}{' '}
                                        <strong className={paColor(g.pa)}>
                                            {g.pa !== null ? `${g.pa}%` : '—'}
                                        </strong>
                                    </span>
                                ),
                            )}
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
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleReset}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reset
                        </Button>
                        {!isStaffDriver && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Download className="h-4 w-4" />
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
                                            href={`/export/monitoring-pa/pdf?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
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
                                            href={`/export/monitoring-pa/excel?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null) as [string, string][])).toString()}`}
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

                {/* ── Quick Presets ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        Periode:
                    </span>
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
                        <CardHeader className="pt-4 pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Filter className="h-4 w-4" />
                                Filter Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                                        Unit
                                    </Label>
                                    <Select
                                        value={form.unit_id ?? 'all'}
                                        onValueChange={(v) =>
                                            setForm({
                                                ...form,
                                                unit_id:
                                                    v === 'all' ? undefined : v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-10 w-full">
                                            <SelectValue placeholder="Semua unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                Semua unit
                                            </SelectItem>
                                            {allUnits.map((u) => (
                                                <SelectItem
                                                    key={u.id}
                                                    value={String(u.id)}
                                                >
                                                    {u.no_unit} ({u.jenis_unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {!isStaffDriver && (
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
                                                        v === 'all'
                                                            ? undefined
                                                            : v,
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
                                )}
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleReset}
                                >
                                    <X className="h-4 w-4" /> Reset
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleApply}
                                >
                                    Terapkan Filter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Legend ── */}
                <Legend threshold={summary.pa_threshold} />

                {/* ── Sort & Count ── */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {unitData.length} unit aktif
                    </p>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">
                            Urutkan:
                        </Label>
                        <Select
                            value={sortBy}
                            onValueChange={(v) => setSortBy(v as typeof sortBy)}
                        >
                            <SelectTrigger className="h-8 w-44 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="actual_asc">
                                    PA Aktual Terendah
                                </SelectItem>
                                <SelectItem value="actual_desc">
                                    PA Aktual Tertinggi
                                </SelectItem>
                                <SelectItem value="status">
                                    Status (BD dahulu)
                                </SelectItem>
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
                            <p className="text-base font-semibold">
                                Tidak ada unit ditemukan
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Coba ubah filter pencarian.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sorted.map((unit) => (
                            <UnitPACard key={unit.id} unit={unit} />
                        ))}
                    </div>
                )}

                {/* ── Info Footer ── */}
                <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                    <p>
                        <strong className="text-foreground">PA</strong> = (T −
                        S) ÷ T × 100% —{' '}
                        <strong className="text-foreground">T</strong> = jam
                        kalender unit dalam periode (sampai saat ini),{' '}
                        <strong className="text-foreground">S</strong> = jam
                        downtime BD / PM / Servis. Semua unit aktif ikut
                        dihitung.
                    </p>
                    <p>
                        Status unit diatur admin di menu Unit. P2H ikut
                        memperbarui: P2H BD → unit BD, P2H Layak Pakai → unit
                        Ready (perubahan terakhir yang berlaku).
                    </p>
                </div>
            </div>
        </>
    );
}

MonitoringIndex.layout = {
    breadcrumbs: [{ title: 'Monitoring PA', href: '/monitoring' }],
};
