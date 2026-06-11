import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface PaPoint {
    label: string;
    pa: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const pa = payload[0].value;
    return (
        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
            <p className="font-semibold text-foreground">{label}</p>
            <p className={pa >= 80 ? 'text-emerald-600' : pa >= 60 ? 'text-amber-600' : 'text-red-600'}>
                PA: <strong>{pa}%</strong>
            </p>
        </div>
    );
}

export function PAWeeklyTrend({ data }: { data: PaPoint[] }) {
    const latest = data[data.length - 1]?.pa ?? 0;
    const prev   = data[data.length - 2]?.pa ?? latest;
    const trend  = latest - prev;

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Trend PA Mingguan
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                    <span>Physical Availability 4 minggu terakhir</span>
                    {trend !== 0 && (
                        <span className={`font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            className="fill-muted-foreground"
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                            className="fill-muted-foreground"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="pa" radius={[4, 4, 0, 0]} maxBarSize={48}>
                            {data.map((entry, idx) => (
                                <Cell
                                    key={idx}
                                    fill={
                                        entry.pa >= 80
                                            ? 'hsl(142 76% 36%)'
                                            : entry.pa >= 60
                                            ? 'hsl(38 92% 50%)'
                                            : 'hsl(0 84% 60%)'
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(142 76% 36%)' }} />
                        ≥ 80% (Baik)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(38 92% 50%)' }} />
                        60–79% (Cukup)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(0 84% 60%)' }} />
                        &lt; 60% (Rendah)
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
