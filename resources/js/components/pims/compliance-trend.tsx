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
import { formatDate, formatPercent } from '@/lib/format';

export type TrendPoint = { date: string; pct: number | null };

/**
 * Tren kepatuhan harian (docs/02#chart · Line): garis chart-1 + area lembut,
 * garis target putus-putus, tooltip gelap. Dipakai Dashboard & Laporan periode.
 */
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

export function ComplianceTrend({
    data,
    compact = false,
    target = 95,
}: {
    data: TrendPoint[];
    compact?: boolean;
    /** Garis target putus-putus (%). */
    target?: number;
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
            aria-label={`Tren kepatuhan ${data.length} hari, target ${target}%`}
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
                        ticks={[domainMin, 90, target, 100].filter(
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
                        y={target}
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

