import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface Metrics {
    total_unit_aktif: number;
    total_p2h_hari_ini: number;
    unit_tidak_layak_hari_ini: number;
    critical_tidak_layak: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="bg-card border-border rounded-lg border px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
                <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.payload.color }}
                />
                <span className="text-xs font-medium">{item.name}</span>
            </div>
            <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-semibold">{item.value}</span> unit
            </p>
        </div>
    );
}

export function FleetStatusChart({ metrics }: { metrics: Metrics }) {
    const unitP2h = metrics.total_p2h_hari_ini;
    const unitTl = metrics.unit_tidak_layak_hari_ini;
    const unitLayak = Math.max(0, unitP2h - unitTl);
    const unitBelumP2h = Math.max(0, metrics.total_unit_aktif - unitP2h);

    const chartData = [
        { name: 'Layak (P2H)', value: unitLayak, color: '#22c55e' },
        { name: 'Ada Item TL', value: unitTl, color: '#f97316' },
        { name: 'Belum P2H', value: unitBelumP2h, color: '#94a3b8' },
    ].filter((d) => d.value > 0);

    const coveragePercent = metrics.total_unit_aktif > 0
        ? Math.round((unitP2h / metrics.total_unit_aktif) * 100)
        : 0;

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="text-emerald-500 h-4 w-4" />
                    Status Armada Hari Ini
                </CardTitle>
                <CardDescription>Distribusi status P2H seluruh unit aktif</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    {/* Pie chart */}
                    <div className="relative flex-shrink-0">
                        <ResponsiveContainer width={120} height={120}>
                            <PieChart>
                                <Pie
                                    data={chartData.length > 0 ? chartData : [{ name: 'Tidak ada data', value: 1, color: '#e2e8f0' }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={36}
                                    outerRadius={52}
                                    paddingAngle={chartData.length > 1 ? 3 : 0}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                    strokeWidth={0}
                                >
                                    {(chartData.length > 0 ? chartData : [{ color: '#e2e8f0' }]).map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold leading-none">{coveragePercent}%</span>
                            <span className="text-muted-foreground text-[10px]">Coverage</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-1 flex-col gap-2.5">
                        <LegendItem color="#22c55e" label="Layak" count={unitLayak} total={metrics.total_unit_aktif} />
                        <LegendItem color="#f97316" label="Ada TL" count={unitTl} total={metrics.total_unit_aktif} />
                        <LegendItem color="#94a3b8" label="Belum P2H" count={unitBelumP2h} total={metrics.total_unit_aktif} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function LegendItem({
    color,
    label,
    count,
    total,
}: {
    color: string;
    label: string;
    count: number;
    total: number;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground min-w-[64px] text-xs">{label}</span>
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-xs font-semibold tabular-nums w-6 text-right">{count}</span>
        </div>
    );
}
