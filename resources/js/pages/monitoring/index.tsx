import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TrendPoint } from '@/components/pims/compliance-trend';
import { ComplianceTrend } from '@/components/pims/compliance-trend';
import { KpiCard, KpiStrip } from '@/components/pims/kpi';
import { PageHeader } from '@/components/pims/page-header';
import { Segmented } from '@/components/pims/segmented';
import { EmptyState } from '@/components/pims/states';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
 * Monitoring PA (design/screens/PA-Desktop.png, docs/screens/laporan.md).
 * PA = jam tersedia ÷ jam kalender per hari (App\Support\PaWeekly).
 */

type UnitWeek = {
    id: number;
    no_unit: string;
    jenis_unit: string;
    avg: number | null;
    days: { date: string; pa: number | null; downtime: number }[];
};

interface Props {
    weekly: {
        range: { start: string; end: string };
        summary: {
            pa: number | null;
            jam_bd: number;
            jam_pm: number;
            di_bawah_target: number;
            unit: number;
            target: number;
        };
        daily: TrendPoint[];
        units: UnitWeek[];
    };
    filters: { jenis_unit: string | null };
}

const parseLocal = (iso: string) => new Date(`${iso}T00:00:00`);
const toIso = (d: Date) => d.toLocaleDateString('en-CA');
const TODAY = toIso(new Date());

/** Ramp kuning 5 tingkat (docs/01#chart · heatmap PA). */
function paCell(pa: number | null) {
    if (pa === null) {
        return 'bg-muted text-muted-foreground';
    }

    if (pa >= 100) {
        return 'bg-brand-50 text-foreground ring-1 ring-brand-200 ring-inset';
    }

    if (pa >= 90) {
        return 'bg-brand-200 text-black';
    }

    if (pa >= 75) {
        return 'bg-brand-400 text-black';
    }

    if (pa >= 60) {
        return 'bg-brand-600 text-white';
    }

    return 'bg-brand-800 text-white';
}

const LEGEND = [
    { label: '100', pa: 100 },
    { label: '≥90', pa: 95 },
    { label: '≥75', pa: 80 },
    { label: '≥60', pa: 65 },
    { label: '<60', pa: 30 },
];

export default function MonitoringPa({ weekly, filters }: Props) {
    const { range, summary, daily, units } = weekly;
    const [asc, setAsc] = useState(true);

    const go = (params: Record<string, string | null | undefined>) =>
        router.get(
            '/monitoring',
            {
                sampai: range.end,
                jenis_unit: filters.jenis_unit ?? undefined,
                ...params,
            },
            { preserveScroll: true, replace: true },
        );

    const shiftWeek = (delta: number) => {
        const d = parseLocal(range.end);
        d.setDate(d.getDate() + delta * 7);
        const iso = toIso(d) > TODAY ? TODAY : toIso(d);

        go({ sampai: iso });
    };

    const sorted = useMemo(
        () =>
            [...units].sort((a, b) =>
                asc
                    ? (a.avg ?? 101) - (b.avg ?? 101)
                    : (b.avg ?? -1) - (a.avg ?? -1),
            ),
        [units, asc],
    );

    const rangeLabel = `${formatDate(parseLocal(range.start), { withYear: false })} – ${formatDate(parseLocal(range.end))}`;
    const dayHeaders = units[0]?.days.map((d) => d.date) ?? [];

    return (
        <>
            <Head title="Monitoring PA" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Monitoring PA"
                    description={`Physical Availability · ${summary.unit} unit${filters.jenis_unit ? ` · ${filters.jenis_unit}` : ''}`}
                    actions={
                        <>
                            <Segmented
                                label="Jenis unit"
                                value={filters.jenis_unit ?? 'all'}
                                onChange={(v) => go({ jenis_unit: v === 'all' ? undefined : v })}
                                options={[
                                    { value: 'all', label: 'Semua' },
                                    { value: 'Light Vehicle', label: 'LV' },
                                    { value: 'Bus', label: 'Bus' },
                                ]}
                            />
                            <div className="flex h-10 items-center rounded-[10px] border-(length:--bw)">
                                <button
                                    type="button"
                                    onClick={() => shiftWeek(-1)}
                                    aria-label="Minggu sebelumnya"
                                    className="grid size-10 place-items-center rounded-l-[10px] hover:bg-muted"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <span className="px-2 text-sm font-semibold whitespace-nowrap tnum">
                                    {rangeLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => shiftWeek(1)}
                                    disabled={range.end >= TODAY}
                                    aria-label="Minggu berikutnya"
                                    className="grid size-10 place-items-center rounded-r-[10px] hover:bg-muted disabled:opacity-40"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                            <Button asChild variant="outline">
                                <a
                                    href={`/export/monitoring-pa/excel?${new URLSearchParams({
                                        date_from: range.start,
                                        date_to: range.end,
                                        ...(filters.jenis_unit ? { jenis_unit: filters.jenis_unit } : {}),
                                    })}`}
                                >
                                    <Download />
                                    Export
                                </a>
                            </Button>
                        </>
                    }
                />

                <KpiStrip cols={4}>
                    <KpiCard
                        label="PA armada"
                        value={formatPercent(summary.pa)}
                        tone={summary.pa !== null && summary.pa < summary.target ? 'danger' : 'default'}
                        sub={`target ≥ ${summary.target}% · 7 hari`}
                    />
                    <KpiCard
                        label="Jam breakdown"
                        value={`${formatNumber(summary.jam_bd)} j`}
                        sub="dari P2H tidak layak & laporan"
                    />
                    <KpiCard
                        label="Jam PM / servis"
                        value={`${formatNumber(summary.jam_pm)} j`}
                        sub="terjadwal"
                    />
                    <KpiCard
                        label="Unit di bawah target"
                        value={summary.di_bawah_target}
                        tone={summary.di_bawah_target > 0 ? 'danger' : 'default'}
                        sub={`rata-rata PA < ${summary.target}%`}
                    />
                </KpiStrip>

                <section
                    aria-labelledby="pa-harian"
                    className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5"
                >
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="pa-harian" className="text-[15px] font-semibold">
                            PA armada harian · 14 hari
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            garis putus = target {summary.target}%
                        </span>
                    </div>
                    <div className="mt-3">
                        <ComplianceTrend data={daily} target={summary.target} />
                    </div>
                </section>

                <section
                    aria-labelledby="pa-unit"
                    className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5"
                >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <h2 id="pa-unit" className="text-[15px] font-semibold">
                            PA per unit · {rangeLabel}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            PA = jam Ready ÷ 24 jam
                            <span className="flex gap-0.5">
                                {LEGEND.map((l) => (
                                    <span
                                        key={l.label}
                                        className={cn(
                                            'rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold',
                                            paCell(l.pa),
                                        )}
                                    >
                                        {l.label}
                                    </span>
                                ))}
                            </span>
                        </div>
                    </div>

                    {units.length === 0 ? (
                        <EmptyState
                            title="Belum ada unit aktif"
                            description="PA dihitung dari unit aktif di Data master."
                        />
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[760px] border-separate border-spacing-[3px] text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground">
                                        <th className="sticky left-0 bg-card text-left font-semibold">Unit</th>
                                        {dayHeaders.map((d) => (
                                            <th
                                                key={d}
                                                className={cn(
                                                    'font-normal',
                                                    d === TODAY && 'font-bold text-foreground',
                                                )}
                                            >
                                                {formatDate(parseLocal(d), { withDay: true, withYear: false }).replace(/ [A-Za-z]+$/, '')}
                                            </th>
                                        ))}
                                        <th
                                            className="pl-3 text-right font-semibold"
                                            aria-sort={asc ? 'ascending' : 'descending'}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setAsc((v) => !v)}
                                                className="inline-flex items-center gap-1 hover:text-foreground"
                                            >
                                                Rata-rata
                                                {asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((u) => (
                                        <tr key={u.id}>
                                            <th
                                                scope="row"
                                                className="sticky left-0 bg-card pr-3 text-left font-semibold whitespace-nowrap tnum"
                                            >
                                                {u.no_unit}
                                            </th>
                                            {u.days.map((d) => (
                                                <td key={d.date} className="p-0">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span
                                                                tabIndex={0}
                                                                className={cn(
                                                                    'grid h-8 place-items-center rounded-[5px] text-xs font-semibold tnum',
                                                                    paCell(d.pa),
                                                                )}
                                                            >
                                                                {d.pa === null ? '—' : Math.round(d.pa)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {u.no_unit} · {formatDate(parseLocal(d.date), { withDay: true, withYear: false })}
                                                            {d.pa === null
                                                                ? ' — belum terdaftar'
                                                                : ` · PA ${formatPercent(d.pa)} · downtime ${formatNumber(d.downtime)} j`}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                            ))}
                                            <td
                                                className={cn(
                                                    'pl-3 text-right font-semibold tnum',
                                                    u.avg !== null && u.avg < summary.target && 'text-danger',
                                                )}
                                            >
                                                {formatPercent(u.avg)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

MonitoringPa.layout = {
    breadcrumbs: [{ title: 'Monitoring PA', href: '/monitoring' }],
};
