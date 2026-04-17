import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChartAreaInteractive } from '@/components/dashboard/chart-area-interactive';
import { DataTable, RecentP2h } from '@/components/dashboard/data-table';
import { FleetStatusChart } from '@/components/dashboard/fleet-status-chart';
import { SectionCards } from '@/components/dashboard/section-cards';
import { ErrorBoundary } from '@/components/error-boundary';
import { dashboard } from '@/routes';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ClipboardPlus, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

interface Metrics {
    total_unit_aktif: number;
    total_p2h_hari_ini: number;
    unit_tidak_layak_hari_ini: number;
    critical_tidak_layak: number;
}

interface ChartPoint {
    tanggal: string;
    label: string;
    total: number;
}

interface Props {
    metrics: Metrics;
    chartData: ChartPoint[];
    recentP2h: RecentP2h[];
}

function getGreeting(): { text: string; emoji: string; sub: string } {
    const hour = new Date().getHours();
    if (hour < 5)  return { text: 'Selamat Malam',  emoji: '🌙', sub: 'Masih terjaga? Pastikan data P2H sudah lengkap.' };
    if (hour < 12) return { text: 'Selamat Pagi',   emoji: '☀️', sub: 'Mulai hari dengan pengecekan P2H yang teliti.' };
    if (hour < 15) return { text: 'Selamat Siang',  emoji: '🌤️', sub: 'Pantau status armada siang ini.' };
    if (hour < 18) return { text: 'Selamat Sore',   emoji: '🌅', sub: 'Cek kembali laporan P2H sebelum shift berakhir.' };
    return          { text: 'Selamat Malam',  emoji: '🌙', sub: 'Pastikan semua laporan P2H hari ini sudah masuk.' };
}

function getFirstName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0];
}

function formatDateId() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());
}

export default function DashboardIndex({ metrics, chartData, recentP2h }: Props) {
    const [alertDismissed, setAlertDismissed] = useState(false);
    const hasCritical = metrics.critical_tidak_layak > 0;
    const hasTL = metrics.unit_tidak_layak_hari_ini > 0;

    const { auth } = usePage<{ auth: { user: { name: string } | null } }>().props;
    const greeting = getGreeting();
    const firstName = auth?.user ? getFirstName(auth.user.name) : null;

    return (
        <>
            <Head title="Dashboard" />
            <div className="@container/main flex flex-1 flex-col gap-0">

                {/* ── Header / Greeting ── */}
                <div className="flex flex-col gap-4 border-b px-4 py-5 lg:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                {formatDateId()}
                            </p>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <span>{greeting.emoji}</span>
                                <span>
                                    {greeting.text}
                                    {firstName && (
                                        <span className="text-primary">, {firstName}</span>
                                    )}!
                                </span>
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {greeting.sub}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/p2h">
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Semua P2H
                                </Button>
                            </Link>
                            <Link href="/p2h/form">
                                <Button size="sm" className="gap-1.5">
                                    <ClipboardPlus className="h-3.5 w-3.5" />
                                    Buat P2H
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Status strip */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {metrics.total_unit_aktif} unit aktif
                        </Badge>
                        <Badge variant="outline" className="gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {metrics.total_p2h_hari_ini} P2H hari ini
                        </Badge>
                        {hasTL && (
                            <Badge variant="secondary" className="gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-3 w-3" />
                                {metrics.unit_tidak_layak_hari_ini} unit ada TL
                            </Badge>
                        )}
                        {hasCritical && (
                            <Badge variant="destructive" className="gap-1.5 text-xs">
                                <ShieldAlert className="h-3 w-3" />
                                {metrics.critical_tidak_layak} item critical TL
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6 py-5">
                    {/* ── Critical Alert Banner ── */}
                    {hasCritical && !alertDismissed && (
                        <div className="px-4 lg:px-6">
                            <Alert variant="destructive" className="relative border-red-500/50 bg-red-50 dark:bg-red-950/30">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle className="font-semibold">
                                    Peringatan: {metrics.critical_tidak_layak} Item Critical Tidak Layak!
                                </AlertTitle>
                                <AlertDescription className="text-sm">
                                    Terdapat item dengan risiko <strong>Critical</strong> yang berstatus Tidak Layak hari ini.
                                    Pastikan unit tidak dioperasikan sebelum diperbaiki.
                                    <Link href="/p2h" className="ml-2 underline underline-offset-2 font-medium">
                                        Lihat detail →
                                    </Link>
                                </AlertDescription>
                                <button
                                    onClick={() => setAlertDismissed(true)}
                                    className="text-destructive/70 hover:text-destructive absolute top-3 right-3 transition-colors"
                                    aria-label="Tutup peringatan"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </Alert>
                        </div>
                    )}

                    {/* ── Metric Cards ── */}
                    <ErrorBoundary label="kartu metrik">
                        <SectionCards metrics={metrics} />
                    </ErrorBoundary>

                    {/* ── Charts Row ── */}
                    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
                        <div className="lg:col-span-2">
                            <ErrorBoundary label="grafik tren P2H">
                                <ChartAreaInteractive data={chartData} />
                            </ErrorBoundary>
                        </div>
                        <div className="lg:col-span-1">
                            <ErrorBoundary label="grafik status armada">
                                <FleetStatusChart metrics={metrics} />
                            </ErrorBoundary>
                        </div>
                    </div>

                    <Separator className="mx-4 w-auto lg:mx-6" />

                    {/* ── Recent P2H Table ── */}
                    <ErrorBoundary label="tabel P2H terbaru">
                        <DataTable data={recentP2h} />
                    </ErrorBoundary>
                </div>
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
