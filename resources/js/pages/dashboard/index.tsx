import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    Check,
    Clock,
    Download,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { ComplianceTrend } from '@/components/pims/compliance-trend';
import type { TrendPoint } from '@/components/pims/compliance-trend';
import { FilterChips } from '@/components/pims/filter-chips';
import { Segmented } from '@/components/pims/segmented';
import { EmptyState } from '@/components/pims/states';
import { NotificationButton } from '@/components/shell/top-bar';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

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
    icon,
    iconClass,
}: {
    icon: React.ReactNode;
    iconClass: string;
    label: string;
    value: React.ReactNode;
    unit?: string;
    sub?: React.ReactNode;
    tone?: 'default' | 'danger' | 'warning';
    subTone?: 'muted' | 'danger' | 'warning' | 'success';
}) {
    return (
        <div className="min-w-0 rounded-xl bg-card p-[18px] shadow-md">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
                <span
                    aria-hidden
                    className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-[10px] [&_svg]:size-4',
                        iconClass,
                    )}
                >
                    {icon}
                </span>
                <span className="truncate">{label}</span>
            </p>
            <p
                className={cn(
                    'mt-3 flex items-baseline text-[32px] leading-none font-extrabold tracking-[-0.03em] tnum',
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
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;
    const hour = new Date().getHours();
    const greeting =
        hour < 11
            ? 'Selamat pagi'
            : hour < 15
              ? 'Selamat siang'
              : hour < 18
                ? 'Selamat sore'
                : 'Selamat malam';
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
        {
            value: 'menunggu' as const,
            label: 'Menunggu setuju',
            count: summary.waiting,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex w-full flex-1 flex-col px-4 pt-4 pb-8 lg:px-10 lg:pt-8">
                {/* ── Hero (desktop, docs/13#2) ── */}
                <header className="relative isolate hidden min-h-[310px] overflow-hidden rounded-2xl px-9 pt-8 pb-20 text-white lg:block">
                    <img
                        src="/images/hero-mountain.jpg"
                        alt=""
                        className="absolute inset-0 -z-20 size-full object-cover object-[50%_30%]"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/65 via-black/35 to-black/5"
                    />
                    <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white/15 px-3 text-[13px] font-medium ring-1 ring-white/25 backdrop-blur-sm">
                            <span
                                aria-hidden
                                className="size-2 rounded-full bg-success-soft"
                            />
                            Diperbarui {updatedAt}
                        </span>
                        <span className="rounded-full bg-white text-black">
                            <NotificationButton />
                        </span>
                    </div>
                    <h1 className="mt-3 text-[34px] leading-tight font-extrabold tracking-[-0.02em]">
                        {greeting}, {auth.user.name.trim().split(/\s+/)[0]}
                    </h1>
                    <p className="mt-2 max-w-[540px] text-[15px] text-white/90">
                        {todayLabel} ·{' '}
                        <b className="font-bold">
                            {summary.belum} unit belum P2H
                        </b>{' '}
                        dan {tlCount} unit Tidak Layak perlu ditinjau.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        <Button asChild variant="brand">
                            <Link href="/monitoring-p2h">Lihat monitoring</Link>
                        </Button>
                        {summary.waiting > 0 && (
                            <Link
                                href="/p2h/approvals"
                                className="inline-flex h-10 press items-center rounded-full bg-white/15 px-4 text-sm font-semibold ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25"
                            >
                                {summary.waiting} menunggu persetujuan
                            </Link>
                        )}
                    </div>
                </header>
                <p className="text-[13px] text-muted-foreground lg:hidden">
                    {todayLabel} · diperbarui {updatedAt}
                </p>

                {/* ── KPI strip (desktop) ── */}
                <section
                    aria-label="Ringkasan hari ini"
                    className="relative -mt-14 hidden grid-cols-3 gap-3 px-6 lg:grid xl:grid-cols-5"
                >
                    <Kpi
                        label="P2H masuk"
                        icon={<Check />}
                        iconClass="bg-brand-soft text-foreground"
                        value={summary.submitted}
                        unit={`/ ${summary.required}`}
                        sub={`${formatPercent(pct)} · ${summary.layak} Layak`}
                    />
                    <Kpi
                        label="Belum P2H"
                        icon={<Clock />}
                        iconClass="bg-warning-soft text-warning"
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
                        icon={<X />}
                        iconClass="bg-danger-soft text-danger"
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
                        icon={<AlertTriangle />}
                        iconClass="bg-muted text-foreground"
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
                        icon={<ArrowUpRight />}
                        iconClass="bg-success-soft text-success"
                        value={pa.today === null ? '—' : formatNumber(pa.today)}
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
                    <div className="rounded-xl bg-card p-5 shadow-sm">
                        <p className="text-[13px] text-muted-foreground">
                            P2H masuk
                        </p>
                        <div className="mt-1 flex items-end justify-between">
                            <p className="text-[52px] leading-none font-extrabold tracking-[-0.03em] tnum">
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
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
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
                                className="press rounded-xl bg-card p-4 shadow-sm"
                            >
                                <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            k.dot,
                                        )}
                                        aria-hidden
                                    />
                                    {k.label}
                                </span>
                                <span className="mt-1.5 block text-[32px] leading-none font-extrabold tracking-[-0.03em] tnum">
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
                <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
                    <section
                        aria-labelledby="tren-title"
                        className="order-2 rounded-xl bg-card p-5 shadow-sm lg:order-1 lg:p-6"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-baseline gap-2">
                                <h2
                                    id="tren-title"
                                    className="text-lg font-bold tracking-[-0.01em]"
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
                        className="order-1 rounded-xl bg-card p-5 shadow-sm lg:order-2 lg:p-6"
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            <h2
                                id="armada-title"
                                className="text-lg font-bold tracking-[-0.01em]"
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
                                                <UnitStatusPill
                                                    status={u.status}
                                                />
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
                    className="mt-6 scroll-mt-20 lg:rounded-xl lg:bg-card lg:p-6 lg:shadow-sm"
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <h2
                            id="status-title"
                            className="text-lg font-bold tracking-[-0.01em]"
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
