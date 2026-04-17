import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface ChartPoint {
    tanggal: string;
    label: string;
    total: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border-border rounded-lg border px-3 py-2 shadow-lg">
            <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
            <p className="text-sm font-semibold">
                <span className="text-blue-500">{payload[0].value}</span>
                <span className="text-muted-foreground ml-1 font-normal">sesi P2H</span>
            </p>
        </div>
    );
}

export function ChartAreaInteractive({ data }: { data: ChartPoint[] }) {
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');

    const total = data.reduce((sum, d) => sum + d.total, 0);
    const avg = data.length > 0 ? (total / data.length).toFixed(1) : '0';
    const max = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;

    const axisStyle = {
        fontSize: 11,
        fill: 'hsl(var(--muted-foreground))',
        fontFamily: 'inherit',
    };

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="text-blue-500 h-4 w-4" />
                            Tren P2H 7 Hari Terakhir
                        </CardTitle>
                        <CardDescription>Jumlah sesi pemeriksaan harian yang tercatat</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border p-0.5">
                            <Button
                                variant={chartType === 'area' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => setChartType('area')}
                            >
                                Area
                            </Button>
                            <Button
                                variant={chartType === 'bar' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => setChartType('bar')}
                            >
                                <BarChart2 className="mr-1 h-3 w-3" />
                                Bar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mini stat strip */}
                <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Total:</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
                            {total}
                        </Badge>
                    </div>
                    <div className="bg-border h-3 w-px" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Rata-rata:</span>
                        <span className="text-xs font-medium">{avg}/hari</span>
                    </div>
                    <div className="bg-border h-3 w-px" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Tertinggi:</span>
                        <span className="text-xs font-medium">{max}</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={220}>
                    {chartType === 'area' ? (
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradP2H" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border))"
                                strokeOpacity={0.6}
                            />
                            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={axisStyle}
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }} />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#gradP2H)"
                                dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 0 }}
                                activeDot={{ r: 5.5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border))"
                                strokeOpacity={0.6}
                            />
                            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={axisStyle}
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3b82f6', fillOpacity: 0.06 }} />
                            <Bar
                                dataKey="total"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
