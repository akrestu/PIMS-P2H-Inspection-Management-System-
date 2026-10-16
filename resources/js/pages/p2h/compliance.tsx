import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Download, X } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
 * Kepatuhan P2H (design/screens/Kepatuhan-Desktop.png, docs/screens/manager-ops.md).
 * Heatmap unit × hari: sel hitam = P2H masuk, × merah = tidak P2H,
 * arsir = BD/PM/Servis (tidak wajib). Data dari P2hComplianceController.
 */

type CellStatus = 'layak' | 'bd' | 'downtime';
type DowntimeTipe = 'BD' | 'PM' | 'Servis Berkala';

interface MatrixCell {
    session_id?: number;
    slots_filled?: number;
    total_tl?: number;
    downtime_tipe?: DowntimeTipe;
    status: CellStatus;
}

interface MatrixRow {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    department: string | null;
    driver: string | null;
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

const TARGET = 95;

const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TODAY = isoDaysAgo(0);

const parseLocal = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);

    return new Date(y, m - 1, d);
};

const DAY_INITIAL = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

function pctTone(pct: number) {
    if (pct < 80) {
        return 'text-danger';
    }

    return pct < TARGET ? 'text-warning' : 'text-foreground';
}

function cellLabel(row: MatrixRow, date: string, cell: MatrixCell | null) {
    const day = formatDate(parseLocal(date), { withDay: true, withYear: false });

    if (!cell) {
        return date > TODAY
            ? `${row.no_unit} · ${day} — belum berjalan`
            : `${row.no_unit} · ${day} — Tidak P2H`;
    }

    if (cell.status === 'downtime') {
        return `${row.no_unit} · ${day} — ${cell.downtime_tipe} (tidak wajib P2H)`;
    }

    const parts = [`${cell.slots_filled ?? 1}× P2H`];

    if (cell.status === 'bd') {
        parts.push('hasil Tidak Layak/BD');
    }

    if (cell.total_tl) {
        parts.push(`${cell.total_tl} item rusak`);
    }

    return `${row.no_unit} · ${day} — ${parts.join(' · ')}`;
}

function HeatCell({
    row,
    date,
}: {
    row: MatrixRow;
    date: string;
}) {
    const cell = row.cells[date] ?? null;
    const label = cellLabel(row, date, cell);
    const base =
        'grid size-[26px] place-items-center rounded-[5px] transition-transform';

    let body;

    if (!cell) {
        body =
            date > TODAY || date === TODAY ? (
                <span
                    className={cn(base, 'border-(length:--bw) border-dashed')}
                />
            ) : (
                <span
                    className={cn(
                        base,
                        'border-(length:--bw) border-danger/50 bg-danger-soft text-danger',
                    )}
                >
                    <X className="size-3.5" strokeWidth={2.5} aria-hidden />
                </span>
            );
    } else if (cell.status === 'downtime') {
        body = (
            <span
                className={cn(
                    base,
                    'bg-[repeating-linear-gradient(135deg,var(--muted)_0_3px,transparent_3px_6px)] ring-1 ring-border ring-inset',
                )}
            />
        );
    } else {
        body = (
            <span className={cn(base, 'bg-foreground')}>
                {cell.status === 'bd' && (
                    <span
                        className="size-2 rounded-full bg-danger ring-2 ring-foreground"
                        aria-hidden
                    />
                )}
            </span>
        );
    }

    const content = cell?.session_id ? (
        <Link
            href={`/p2h/${cell.session_id}`}
            aria-label={label}
            className="rounded-[5px] hover:scale-110"
        >
            {body}
        </Link>
    ) : (
        <span tabIndex={0} aria-label={label} className="rounded-[5px]">
            {body}
        </span>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function Legend() {
    const item = 'flex items-center gap-1.5';
    const sw = 'inline-block size-3 rounded-[3px]';

    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className={item}>
                <span className={cn(sw, 'bg-foreground')} /> P2H masuk
            </li>
            <li className={item}>
                <span className={cn(sw, 'relative bg-foreground')}>
                    <span className="absolute inset-[3px] rounded-full bg-danger" />
                </span>
                Hasil Tidak Layak
            </li>
            <li className={item}>
                <span
                    className={cn(
                        sw,
                        'border border-danger/50 bg-danger-soft',
                    )}
                />
                Tidak P2H
            </li>
            <li className={item}>
                <span
                    className={cn(
                        sw,
                        'bg-[repeating-linear-gradient(135deg,var(--muted)_0_2px,transparent_2px_4px)] ring-1 ring-border',
                    )}
                />
                BD/PM (tidak wajib)
            </li>
        </ul>
    );
}

export default function P2hCompliance({ matrix, dates, summary, filters }: Props) {
    const [sortAsc, setSortAsc] = useState(true);

    const rangeDays = dates.length;
    const range = (['7', '14', '30'] as const).find(
        (r) => Number(r) === rangeDays && filters.date_to === TODAY,
    );

    const setRange = (r: '7' | '14' | '30') =>
        router.get(
            '/p2h-compliance',
            {
                date_from: isoDaysAgo(Number(r) - 1),
                date_to: TODAY,
                jenis_unit: filters.jenis_unit ?? undefined,
            },
            { preserveScroll: true, replace: true },
        );

    const rows = useMemo(
        () =>
            [...matrix].sort((a, b) =>
                sortAsc
                    ? a.compliance_pct - b.compliance_pct
                    : b.compliance_pct - a.compliance_pct,
            ),
        [matrix, sortAsc],
    );

    const totalCells = summary.total_units * summary.total_days;
    const filled = totalCells - summary.total_missed - countDowntime(matrix);
    const attention = [...matrix]
        .filter((r) => r.compliance_pct < TARGET)
        .sort((a, b) => a.compliance_pct - b.compliance_pct)
        .slice(0, 3);

    const exportQuery = new URLSearchParams({
        date_from: filters.date_from,
        date_to: filters.date_to,
        ...(filters.jenis_unit ? { jenis_unit: filters.jenis_unit } : {}),
    }).toString();

    return (
        <>
            <Head title="Kepatuhan P2H" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Kepatuhan P2H"
                    description={`${formatDate(parseLocal(filters.date_from), { withYear: false })} – ${formatDate(parseLocal(filters.date_to))} · ${summary.total_units} unit${filters.jenis_unit ? ` · ${filters.jenis_unit}` : ''}`}
                    actions={
                        <>
                            <Segmented
                                label="Rentang"
                                value={range ?? ('' as '7')}
                                onChange={setRange}
                                options={[
                                    { value: '7', label: '7 hari' },
                                    { value: '14', label: '14 hari' },
                                    { value: '30', label: '30 hari' },
                                ]}
                            />
                            <Button asChild variant="outline">
                                <Link href="/unit-monitoring">Harian unit</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <a href={`/export/monitoring-p2h/excel?${exportQuery}`}>
                                    <Download />
                                    Export
                                </a>
                            </Button>
                        </>
                    }
                />

                <KpiStrip cols={4}>
                    <KpiCard
                        label="Kepatuhan armada"
                        value={formatPercent(summary.fleet_compliance)}
                        tone={
                            summary.fleet_compliance < 80
                                ? 'danger'
                                : summary.fleet_compliance < TARGET
                                  ? 'warning'
                                  : 'default'
                        }
                        sub={`target ≥ ${TARGET}%`}
                    />
                    <KpiCard
                        label="P2H tercatat"
                        value={filled}
                        sub={`dari ${totalCells} unit-hari`}
                    />
                    <KpiCard
                        label="Tidak P2H"
                        value={summary.total_missed}
                        tone={summary.total_missed > 0 ? 'danger' : 'default'}
                        sub={
                            totalCells > 0
                                ? `${formatPercent((summary.total_missed / totalCells) * 100)} dari unit-hari`
                                : '—'
                        }
                    />
                    <KpiCard
                        label="Unit 100% patuh"
                        value={summary.perfect_units}
                        sub={`dari ${summary.total_units} unit`}
                    />
                </KpiStrip>

                {matrix.length === 0 ? (
                    <EmptyState
                        title="Belum ada unit aktif"
                        description="Kepatuhan dihitung dari unit aktif di Data master."
                    />
                ) : (
                    <section
                        aria-labelledby="heatmap-title"
                        className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5"
                    >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <h2
                                id="heatmap-title"
                                className="text-[15px] font-semibold"
                            >
                                Per unit per hari
                            </h2>
                            <Legend />
                        </div>

                        <div className="mt-4 overflow-x-auto">
                            <table className="border-separate border-spacing-x-[2px] border-spacing-y-[6px]">
                                <thead>
                                    <tr className="text-[11px] text-muted-foreground">
                                        <th className="sticky left-0 z-10 bg-card pr-3 text-left text-xs font-semibold">
                                            Unit · driver
                                        </th>
                                        {dates.map((d) => {
                                            const date = parseLocal(d);
                                            const isToday = d === TODAY;

                                            return (
                                                <th
                                                    key={d}
                                                    className={cn(
                                                        'w-[28px] text-center leading-tight font-normal',
                                                        isToday &&
                                                            'font-bold text-foreground',
                                                    )}
                                                >
                                                    <span className="block">
                                                        {DAY_INITIAL[date.getDay()]}
                                                    </span>
                                                    <span className="block tnum">
                                                        {date.getDate()}
                                                    </span>
                                                </th>
                                            );
                                        })}
                                        <th
                                            className="pl-4 text-right text-xs font-semibold"
                                            aria-sort={sortAsc ? 'ascending' : 'descending'}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSortAsc((v) => !v)}
                                                className="inline-flex items-center gap-1 hover:text-foreground"
                                            >
                                                Patuh
                                                {sortAsc ? (
                                                    <ArrowUp className="size-3" />
                                                ) : (
                                                    <ArrowDown className="size-3" />
                                                )}
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <th
                                                scope="row"
                                                className="sticky left-0 z-10 min-w-[120px] bg-card pr-3 text-left font-normal"
                                            >
                                                <span className="block text-sm leading-tight font-semibold tnum">
                                                    {row.no_unit}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {row.driver ?? '—'}
                                                </span>
                                            </th>
                                            {dates.map((d) => (
                                                <td key={d} className="p-0">
                                                    <HeatCell row={row} date={d} />
                                                </td>
                                            ))}
                                            <td
                                                className={cn(
                                                    'pl-4 text-right text-sm font-semibold tnum',
                                                    pctTone(row.compliance_pct),
                                                )}
                                            >
                                                {Math.round(row.compliance_pct)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {attention.length > 0 && (
                    <section aria-labelledby="perhatian-title">
                        <h2
                            id="perhatian-title"
                            className="text-[15px] font-semibold"
                        >
                            Perlu perhatian
                        </h2>
                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            {attention.map((row) => {
                                const missed = dates.filter(
                                    (d) => d < TODAY && !row.cells[d],
                                ).length;
                                const bd = dates.filter(
                                    (d) => row.cells[d]?.status === 'bd',
                                ).length;

                                return (
                                    <div
                                        key={row.id}
                                        className="rounded-[14px] border-(length:--bw) bg-card p-4"
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="min-w-0 truncate">
                                                <span className="font-semibold tnum">
                                                    {row.no_unit}
                                                </span>{' '}
                                                <span className="text-[13px] text-muted-foreground">
                                                    {row.driver ?? ''}
                                                </span>
                                            </p>
                                            <span
                                                className={cn(
                                                    'text-sm font-semibold tnum',
                                                    pctTone(row.compliance_pct),
                                                )}
                                            >
                                                {Math.round(row.compliance_pct)}%
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                                            {missed}× tidak P2H
                                            {bd > 0 && ` · ${bd}× hasil Tidak Layak`}{' '}
                                            dalam {rangeDays} hari
                                        </p>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="mt-3"
                                        >
                                            <Link
                                                href={`/p2h?no_unit=${encodeURIComponent(row.no_unit)}`}
                                            >
                                                Lihat riwayat {row.no_unit}
                                            </Link>
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

function countDowntime(matrix: MatrixRow[]) {
    return matrix.reduce(
        (n, r) =>
            n +
            Object.values(r.cells).filter((c) => c?.status === 'downtime')
                .length,
        0,
    );
}

P2hCompliance.layout = {
    breadcrumbs: [{ title: 'Kepatuhan', href: '/p2h-compliance' }],
};
