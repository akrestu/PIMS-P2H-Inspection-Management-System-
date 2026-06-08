import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Car, ClipboardCheck, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';

interface Metrics {
    total_unit_aktif: number;
    total_p2h_hari_ini: number;
    unit_tidak_layak_hari_ini: number;
    critical_tidak_layak: number;
}

interface CardConfig {
    title: string;
    value: number;
    description: string;
    hint?: string;
    icon: React.ElementType;
    accent: string;
    iconBg: string;
    iconColor: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    progress?: number;
    progressColor?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
}

export function SectionCards({ metrics }: { metrics: Metrics }) {
    const p2hRatio = metrics.total_unit_aktif > 0
        ? Math.round((metrics.total_p2h_hari_ini / metrics.total_unit_aktif) * 100)
        : 0;

    const tlRatio = metrics.total_p2h_hari_ini > 0
        ? Math.round((metrics.unit_tidak_layak_hari_ini / metrics.total_p2h_hari_ini) * 100)
        : 0;

    const cards: CardConfig[] = [
        {
            title: 'Total Unit Aktif',
            value: metrics.total_unit_aktif,
            description: 'Unit beroperasi',
            hint: 'Jumlah unit kendaraan yang berstatus aktif dalam sistem.',
            icon: Car,
            accent: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            iconColor: 'text-blue-600 dark:text-blue-400',
            badge: 'Armada',
            badgeVariant: 'secondary',
            trend: 'neutral',
        },
        {
            title: 'P2H Hari Ini',
            value: metrics.total_p2h_hari_ini,
            description: `${p2hRatio}% dari total unit`,
            hint: 'Jumlah sesi P2H yang terdaftar hari ini dibanding total unit aktif.',
            icon: ClipboardCheck,
            accent: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            badge: metrics.total_p2h_hari_ini > 0 ? 'Aktif' : 'Belum ada',
            badgeVariant: metrics.total_p2h_hari_ini > 0 ? 'default' : 'secondary',
            progress: p2hRatio,
            progressColor: 'bg-emerald-500',
            trend: p2hRatio >= 80 ? 'up' : p2hRatio > 0 ? 'neutral' : 'down',
            trendLabel: `${p2hRatio}% coverage`,
        },
        {
            title: 'Unit Ada Item TL',
            value: metrics.unit_tidak_layak_hari_ini,
            description: `${tlRatio}% dari P2H hari ini`,
            hint: 'Unit yang memiliki minimal satu item tidak layak pada P2H hari ini.',
            icon: AlertTriangle,
            accent: metrics.unit_tidak_layak_hari_ini > 0
                ? 'from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/5'
                : 'from-slate-500/10 to-slate-500/5 dark:from-slate-500/20 dark:to-slate-500/5',
            iconBg: metrics.unit_tidak_layak_hari_ini > 0
                ? 'bg-orange-100 dark:bg-orange-900/40'
                : 'bg-slate-100 dark:bg-slate-800/40',
            iconColor: metrics.unit_tidak_layak_hari_ini > 0
                ? 'text-orange-500 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400',
            badge: metrics.unit_tidak_layak_hari_ini > 0 ? 'Perhatian' : 'Aman',
            badgeVariant: metrics.unit_tidak_layak_hari_ini > 0 ? 'secondary' : 'default',
            progress: tlRatio,
            progressColor: tlRatio > 30 ? 'bg-orange-500' : 'bg-emerald-500',
            trend: metrics.unit_tidak_layak_hari_ini > 0 ? 'down' : 'up',
            trendLabel: `${tlRatio}% dari P2H hari ini`,
        },
        {
            title: 'Item AA (Stop) TL',
            value: metrics.critical_tidak_layak,
            description: 'Kode Bahaya AA – unit harus distop',
            hint: 'Jumlah item dengan kode bahaya AA yang berstatus Tidak Layak hari ini.',
            icon: ShieldAlert,
            accent: metrics.critical_tidak_layak > 0
                ? 'from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5'
                : 'from-slate-500/10 to-slate-500/5 dark:from-slate-500/20 dark:to-slate-500/5',
            iconBg: metrics.critical_tidak_layak > 0
                ? 'bg-red-100 dark:bg-red-900/40'
                : 'bg-slate-100 dark:bg-slate-800/40',
            iconColor: metrics.critical_tidak_layak > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400',
            badge: metrics.critical_tidak_layak > 0 ? 'Kritis!' : 'Aman',
            badgeVariant: metrics.critical_tidak_layak > 0 ? 'destructive' : 'default',
            trend: metrics.critical_tidak_layak > 0 ? 'down' : 'up',
            trendLabel: metrics.critical_tidak_layak > 0 ? 'Butuh tindakan segera' : 'Tidak ada item kritis',
        },
    ];

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Tooltip key={card.title}>
                            <TooltipTrigger asChild>
                                <Card
                                    className={`relative overflow-hidden bg-gradient-to-br ${card.accent} border-border/60 cursor-default transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                                >
                                    <CardHeader className="pb-2 pt-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                                    {card.title}
                                                </p>
                                                <p className="text-3xl font-bold tabular-nums leading-none">
                                                    {card.value}
                                                </p>
                                            </div>
                                            <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                                                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    {card.trend === 'up' && (
                                                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                                                    )}
                                                    {card.trend === 'down' && (
                                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                                    )}
                                                    <span className="text-muted-foreground text-xs">
                                                        {card.trendLabel ?? card.description}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant={card.badgeVariant ?? 'secondary'}
                                                    className="text-xs px-1.5 py-0"
                                                >
                                                    {card.badge}
                                                </Badge>
                                            </div>
                                            {card.progress !== undefined && (
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={card.progress}
                                                        className="h-1.5 bg-black/10 dark:bg-white/10"
                                                    />
                                                </div>
                                            )}
                                            {card.description && card.trendLabel && (
                                                <p className="text-muted-foreground/70 text-xs">{card.description}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TooltipTrigger>
                            {card.hint && (
                                <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs">
                                    {card.hint}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
