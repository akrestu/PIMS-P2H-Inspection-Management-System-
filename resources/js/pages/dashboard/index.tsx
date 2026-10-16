import { Head, Link } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Area,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    TodayListCard,
    TodayTable,
    UnitStatusPill,
    filterRows,
} from '@/components/dashboard/today-status';
import type {
    TodayFilter,
    TodayFleet,
    TodayRow,
    TodaySummary,
} from '@/components/dashboard/today-status';
import { ErrorBoundary } from '@/components/error-boundary';
import { FilterChips } from '@/components/pims/filter-chips';
import { Segmented } from '@/components/pims/segmented';
import { EmptyState } from '@/components/pims/states';
import { NotificationButton } from '@/components/shell/top-bar';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type TrendPoint = { date: string; pct: number | null };

interface Props {
    today: { rows: TodayRow[]; summary: TodaySummary; fleet: TodayFleet };
    complianceTrend: TrendPoint[];
    pa: { today: number | null; yesterday: number | null };
    updatedAt: string;
}

const TARGET = 95;

const FLEET_SEGMENTS = [
    { key: 'ready', label: 'Ready', className: 'bg-success' },
    { key: 'bd', label: 'BD', className: 'bg-danger' },
    { key: 'pm', label: 'PM', className: 'bg-info' },
    { key: 'servis', label: 'Servis', className: 'bg-info/45' },
] as const;

/* ────────────────────────── KPI ────────────────────────── */

function Kpi({
    label,
    value,
    unit,
    sub,
    tone = 'default',
    subTone = 'muted',
}: {
    label: string;
    value: React.ReactNode;
    unit?: string;
    sub?: React.ReactNode;
    tone?: 'default' | 'danger' | 'warning';
    subTone?: 'muted' | 'danger' | 'warning' | 'success';
}) {
    return (
        <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p
                className={cn(
                    'mt-1.5 flex items-baseline text-[36px] leading-none font-semibold tracking-[-0.03em] tnum',
                    tone === 'danger' && 'text-danger',
                    tone === 'warning' && 'text-warning',
                )}
            >
                {value}
                {unit && (
                    <span className="ml-0.5 text-base font-medium tracking-normal text-muted-foreground">
                        {unit}
                    </span>
                )}
            </p>
            {sub && (
                <p
                    className={cn(
                        'mt-2.5 truncate text-[13px]',
                        subTone === 'muted' && 'text-muted-foreground',
                        subTone === 'danger' && 'font-semibold text-danger',
                        subTone === 'warning' && 'font-semibold text-warning',
                        subTone === 'success' && 'font-semibold text-success',
                    )}
                >
                    {sub}
                </p>
            )}
        </div>
    );
}

function paDelta(pa: Props['pa']) {
    if (pa.today === null || pa.yesterday === null) {
        return null;
    }

    const d = Math.round((pa.today - pa.yesterday) * 10) / 10;

    return {
        value: d,
        text: `${d >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(d))} poin vs kemarin`,
    };
}

/* ────────────────────────── Charts ────────────────────────── */

function TrendTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { payload: TrendPoint }[];
}) {
    const p = payload?.[0]?.payload;

    if (!active || !p) {
        return null;
    }

    return (
        <div className="rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg">
            <p className="font-medium">
                {formatDate(p.date, { withDay: true, withYear: false })}
            </p>
            <p className="mt-0.5 tnum">Kepatuhan {formatPercent(p.pct)}</p>
        </div>
    );
}

function ComplianceTrend({
    data,
    compact = false,
}: {
    data: TrendPoint[];
    compact?: boolean;
}) {
    const values = data.map((d) => d.pct ?? 0);
    const min = Math.min(80, ...values);
    const domainMin = Math.max(0, Math.floor((min - 5) / 10) * 10);
    const ticks = [0, Math.floor(data.length / 2), data.length - 1].map(
        (i) => data[i]?.date,
    );

    return (
        <div
            className={compact ? 'h-[180px]' : 'h-[240px]'}
            role="img"
            aria-label={`Tren kepatuhan ${data.length} hari, target ${TARGET}%`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                >
                    <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        ticks={ticks}
                        tickFormatter={(d: string) =>
                            formatDate(d, { withYear: false })
                        }
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        orientation="right"
                        domain={[domainMin, 100]}
                        ticks={[domainMin, 90, TARGET, 100].filter(
                            (v, i, a) => a.indexOf(v) === i && v >= domainMin,
                        )}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                    />
                    <Tooltip
                        content={<TrendTooltip />}
                        cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                    />
                    <ReferenceLine
                        y={TARGET}
                        stroke="var(--chart-ref)"
                        strokeDasharray="4 4"
                    />
                    <Area
                        type="linear"
                        dataKey="pct"
                        stroke="none"
                        fill="url(#trendFill)"
                        isAnimationActive={false}
                    />
                    <Line
                        type="linear"
                        dataKey="pct"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                            r: 5,
                            stroke: 'var(--background)',
                            strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

function FleetBar({ fleet }: { fleet: TodayFleet }) {
    return (
        <div
            className="flex h-6 gap-0.5 overflow-hidden rounded-md"
            role="img"
            aria-label={FLEET_SEGMENTS.map(
                (s) => `${s.label} ${fleet.counts[s.key]}`,
            ).join(', ')}
        >
            {FLEET_SEGMENTS.map((s) =>
                fleet.counts[s.key] > 0 ? (
                    <span
                        key={s.key}
                        className={cn('h-full', s.className)}
                        style={{ flexGrow: fleet.counts[s.key] }}
                    />
                ) : null,
            )}
        </div>
    );
}

function FleetLegend({
    fleet,
    stacked = false,
}: {
    fleet: TodayFleet;
    stacked?: boolean;
}) {
    return (
        <ul
            className={cn(
                'text-[13px]',
                stacked
                    ? 'grid grid-cols-4 gap-2'
                    : 'flex flex-wrap gap-x-5 gap-y-1',
            )}
        >
            {FLEET_SEGMENTS.map((s) => (
                <li
                    key={s.key}
                    className={cn(
                        stacked ? 'flex flex-col' : 'flex items-center gap-1.5',
                    )}
                >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                            className={cn('size-2 rounded-[2px]', s.className)}
                            aria-hidden
                        />
                        {s.label}
                    </span>
                    <span
                        className={cn(
                            'font-semibold tnum',
                            stacked && 'mt-1 text-xl',
                        )}
                    >
                        {fleet.counts[s.key]}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/* ────────────────────────── Page ────────────────────────── */

export default function DashboardIndex({
    today,
    complianceTrend,
    pa,
    updatedAt,
}: Props) {
    const { rows, summary, fleet } = today;
    const [filter, setFilter] = useState<TodayFilter>('semua');
    const [range, setRange] = useState<'7' | '30'>('7');

    const visible = useMemo(() => filterRows(rows, filter), [rows, filter]);
    const pct =
        summary.required > 0 ? (summary.submitted / summary.required) * 100 : 0;
    const avg = useMemo(() => {
        const v = complianceTrend.filter((d) => d.pct !== null);

        return v.length
            ? v.reduce((s, d) => s + (d.pct ?? 0), 0) / v.length
            : null;
    }, [complianceTrend]);
    const delta = paDelta(pa);
    const todayLabel = formatDate(new Date(), { withDay: true });
    const tlCount = summary.tidak_layak.length;

    const chips = [
        { value: 'semua' as const, label: 'Semua', count: rows.length },
        { value: 'belum' as const, label: 'Belum P2H', count: summary.belum },
        { value: 'tidak-layak' as const, label: 'Tidak Layak', count: tlCount },
        { value: 'menunggu' as const, label: 'Menunggu setuju', count: summary.waiting },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 pt-4 pb-8 lg:px-10 lg:pt-8">
                {/* ── Header (desktop) ── */}
                <header className="hidden items-start justify-between gap-4 lg:flex">
                    <div className="min-w-0">
                        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {todayLabel} · diperbarui {updatedAt}
                        </p>
                    </div>
                    <NotificationButton />
                </header>
                <p className="text-[13px] text-muted-foreground lg:hidden">
                    {todayLabel} · diperbarui {updatedAt}
                </p>

                {/* ── KPI strip (desktop) ── */}
                <section
                    aria-label="Ringkasan hari ini"
                    className="mt-8 hidden grid-cols-5 gap-6 border-b-(length:--bw) pb-6 lg:grid"
                >
                    <Kpi
                        label="P2H masuk"
                        value={summary.submitted}
                        unit={`/ ${summary.required}`}
                        sub={`${formatPercent(pct)} · ${summary.layak} Layak`}
                    />
                    <Kpi
                        label="Belum P2H"
                        value={summary.belum}
                        sub={
                            summary.belum > 0
                                ? 'unit Ready belum diperiksa'
                                : 'Semua unit sudah P2H'
                        }
                        subTone={summary.belum > 0 ? 'warning' : 'muted'}
                    />
                    <Kpi
                        label="Tidak Layak"
                        value={tlCount}
                        tone={tlCount > 0 ? 'danger' : 'default'}
                        sub={
                            tlCount > 0
                                ? summary.tidak_layak.join(' · ')
                                : 'Tidak ada'
                        }
                    />
                    <Kpi
                        label="Temuan open"
                        value={summary.findings_open}
                        sub={
                            summary.findings_overdue > 0
                                ? `${summary.findings_overdue} lewat tenggat`
                                : 'Tidak ada yang lewat tenggat'
                        }
                        subTone={
                            summary.findings_overdue > 0 ? 'danger' : 'muted'
                        }
                    />
                    <Kpi
                        label="PA hari ini"
                        value={
                            pa.today === null ? '—' : formatNumber(pa.today)
                        }
                        unit={pa.today === null ? undefined : '%'}
                        sub={delta?.text ?? 'Belum ada data kemarin'}
                        subTone={
                            !delta
                                ? 'muted'
                                : delta.value >= 0
                                  ? 'success'
                                  : 'danger'
                        }
                    />
                </section>

                {/* ── Hero (mobile) ── */}
                <section aria-label="P2H masuk" className="mt-4 lg:hidden">
                    <p className="text-[13px] text-muted-foreground">
                        P2H masuk
                    </p>
                    <div className="mt-1 flex items-end justify-between">
                        <p className="text-[52px] leading-none font-semibold tracking-[-0.03em] tnum">
                            {summary.submitted}
                            <span className="ml-2 text-[26px] font-medium tracking-normal text-muted-foreground">
                                / {summary.required} unit
                            </span>
                        </p>
                        <p className="text-base font-semibold tnum">
                            {formatPercent(pct)}
                        </p>
                    </div>
                    <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                        <span
                            className="bg-success"
                            style={{ flexGrow: summary.layak }}
                        />
                        <span
                            className="bg-danger"
                            style={{ flexGrow: tlCount }}
                        />
                        <span style={{ flexGrow: summary.belum }} />
                    </div>
                    <ul className="mt-3 flex gap-4 text-[13px] text-muted-foreground">
                        <li className="flex items-center gap-1.5">
                            <span className="size-2 rounded-[2px] bg-success" />
                            {summary.layak} Layak
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span className="size-2 rounded-[2px] bg-danger" />
                            {tlCount} Tidak Layak
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span className="size-2 rounded-[2px] bg-muted ring-1 ring-border" />
                            {summary.belum} Belum
                        </li>
                    </ul>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        {[
                            {
                                label: 'Belum P2H',
                                value: summary.belum,
                                dot: 'bg-warning',
                                sub:
                                    summary.belum > 0
                                        ? 'unit Ready'
                                        : 'Semua sudah',
                                subTone:
                                    summary.belum > 0
                                        ? 'text-warning font-semibold'
                                        : '',
                                href: '#status-hari-ini',
                            },
                            {
                                label: 'Tidak Layak',
                                value: tlCount,
                                dot: 'bg-danger',
                                sub: tlCount
                                    ? summary.tidak_layak.join(' · ')
                                    : 'Tidak ada',
                                subTone: '',
                                href: '#status-hari-ini',
                            },
                            {
                                label: 'Temuan open',
                                value: summary.findings_open,
                                dot: 'bg-info',
                                sub: summary.findings_overdue
                                    ? `${summary.findings_overdue} lewat tenggat`
                                    : 'Sesuai tenggat',
                                subTone: summary.findings_overdue
                                    ? 'text-danger font-semibold'
                                    : '',
                                href: '/p2h/findings',
                            },
                            {
                                label: 'Menunggu setuju',
                                value: summary.waiting,
                                dot: 'bg-warning',
                                sub: summary.escalated
                                    ? `${summary.escalated} dieskalasi`
                                    : 'Tidak ada eskalasi',
                                subTone: '',
                                href: '/p2h/approvals',
                            },
                        ].map((k) => (
                            <Link
                                key={k.label}
                                href={k.href}
                                className="press rounded-[14px] border-(length:--bw) bg-muted-2 p-4"
                            >
                                <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                    <span
                                        className={cn('size-1.5 rounded-full', k.dot)}
                                        aria-hidden
                                    />
                                    {k.label}
                                </span>
                                <span className="mt-1.5 block text-[30px] leading-none font-semibold tracking-[-0.03em] tnum">
                                    {k.value}
                                </span>
                                <span
                                    className={cn(
                                        'mt-2 block truncate text-xs text-muted-foreground',
                                        k.subTone,
                                    )}
                                >
                                    {k.sub}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── Tren kepatuhan + Ketersediaan armada ── */}
                <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <section
                        aria-labelledby="tren-title"
                        className="order-2 lg:order-1"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-baseline gap-2">
                                <h2
                                    id="tren-title"
                                    className="text-lg font-semibold tracking-[-0.01em]"
                                >
                                    Tren kepatuhan
                                    <span className="hidden lg:inline">
                                        {' '}
                                        · 30 hari
                                    </span>
                                </h2>
                                <span className="hidden truncate text-xs text-muted-foreground lg:inline">
                                    rata-rata {formatPercent(avg)} · target{' '}
                                    {TARGET}%
                                </span>
                            </div>
                            <Segmented
                                className="lg:hidden"
                                label="Rentang tren"
                                value={range}
                                onChange={(v) => setRange(v as '7' | '30')}
                                options={[
                                    { value: '7', label: '7 hari' },
                                    { value: '30', label: '30 hari' },
                                ]}
                            />
                        </div>
                        <div className="mt-4">
                            <ErrorBoundary label="grafik tren kepatuhan">
                                <div className="hidden lg:block">
                                    <ComplianceTrend data={complianceTrend} />
                                </div>
                                <div className="lg:hidden">
                                    <ComplianceTrend
                                        compact
                                        data={complianceTrend.slice(
                                            -Number(range),
                                        )}
                                    />
                                </div>
                            </ErrorBoundary>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-4 w-full lg:hidden"
                        >
                            <Link href="/p2h-compliance">
                                Lihat kepatuhan per unit
                            </Link>
                        </Button>
                    </section>

                    <section
                        aria-labelledby="armada-title"
                        className="order-1 lg:order-2"
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            <h2
                                id="armada-title"
                                className="text-lg font-semibold tracking-[-0.01em]"
                            >
                                Ketersediaan armada
                            </h2>
                            <span className="text-[13px] text-muted-foreground tnum">
                                <span className="lg:hidden">
                                    PA{' '}
                                    <b className="font-semibold text-foreground">
                                        {formatPercent(pa.today)}
                                    </b>
                                </span>
                                <span className="hidden lg:inline">
                                    {fleet.total} unit
                                </span>
                            </span>
                        </div>
                        <div className="mt-4">
                            <FleetBar fleet={fleet} />
                        </div>
                        <div className="mt-3 lg:hidden">
                            <FleetLegend fleet={fleet} stacked />
                        </div>
                        <div className="mt-3 hidden lg:block">
                            <FleetLegend fleet={fleet} />
                        </div>

                        <div className="mt-5 hidden lg:block">
                            <h3 className="text-sm font-semibold">
                                Tidak Ready
                            </h3>
                            {fleet.not_ready.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Semua unit Ready.
                                </p>
                            ) : (
                                <ul className="mt-1.5">
                                    {fleet.not_ready.slice(0, 7).map((u) => (
                                        <li
                                            key={u.no_unit}
                                            className="grid h-[37px] grid-cols-[96px_80px_1fr] items-center gap-2 border-b-(length:--bw) text-sm"
                                        >
                                            <span className="font-semibold tnum">
                                                {u.no_unit}
                                            </span>
                                            <span>
                                                <UnitStatusPill status={u.status} />
                                            </span>
                                            <span className="truncate text-muted-foreground">
                                                {u.note ?? '—'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {fleet.not_ready.length > 7 && (
                                <Link
                                    href="/downtime"
                                    className="mt-2 inline-block text-[13px] font-medium underline-offset-2 hover:underline"
                                >
                                    Lihat semua ({fleet.not_ready.length})
                                </Link>
                            )}
                        </div>
                    </section>
                </div>

                {/* ── Status P2H hari ini ── */}
                <section
                    id="status-hari-ini"
                    aria-labelledby="status-title"
                    className="mt-10 scroll-mt-20"
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <h2
                            id="status-title"
                            className="text-lg font-semibold tracking-[-0.01em]"
                        >
                            Status P2H hari ini
                        </h2>
                        <div className="flex items-center gap-2">
                            <FilterChips
                                label="Filter status P2H"
                                options={chips}
                                value={filter}
                                onChange={setFilter}
                                className="-mx-4 px-4 lg:mx-0 lg:px-0"
                            />
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="hidden h-[34px] lg:inline-flex"
                            >
                                <a href="/export/monitoring-p2h/excel">
                                    <Download />
                                    Export
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4">
                        {visible.length === 0 ? (
                            <EmptyState
                                title="Tidak ada unit"
                                description="Tidak ada unit dengan status ini hari ini."
                            />
                        ) : (
                            <>
                                <div className="hidden lg:block">
                                    <TodayTable rows={visible} />
                                </div>
                                <ul className="flex flex-col gap-2 lg:hidden">
                                    {visible.map((row) => (
                                        <li key={row.unit_id}>
                                            <TodayListCard row={row} />
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

DashboardIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
