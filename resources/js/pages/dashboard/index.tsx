import { Head, Link } from '@inertiajs/react';
import { ClipboardPlus, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { ChartAreaInteractive } from '@/components/dashboard/chart-area-interactive';
import type { RecentP2h } from '@/components/dashboard/data-table';
import { DataTable } from '@/components/dashboard/data-table';
import { FleetTodayChart } from '@/components/dashboard/fleet-today-chart';
import type { FleetCounts } from '@/components/dashboard/fleet-today-chart';
import { PAWeeklyTrend } from '@/components/dashboard/pa-weekly-trend';
import { ErrorBoundary } from '@/components/error-boundary';
import { KpiCard, KpiStrip } from '@/components/pims/kpi';
import { PageHeader } from '@/components/pims/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { dashboard } from '@/routes';

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

interface PaPoint {
    label: string;
    pa: number;
}

interface Props {
    fleetToday: Record<string, FleetCounts>;
    metrics: Metrics;
    chartData: ChartPoint[];
    paWeeklyTrend: PaPoint[];
    recentP2h: RecentP2h[];
}

function formatDateId() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());
}

const CRITICAL_ALERT_KEY = `critical_alert_dismissed_${new Date().toISOString().slice(0, 10)}`;

export default function DashboardIndex({
    fleetToday,
    metrics,
    chartData,
    paWeeklyTrend,
    recentP2h,
}: Props) {
    const [alertDismissed, setAlertDismissed] = useState(
        () => localStorage.getItem(CRITICAL_ALERT_KEY) === '1',
    );
    const hasCritical = metrics.critical_tidak_layak > 0;
    const hasTL = metrics.unit_tidak_layak_hari_ini > 0;

    // Ringkasan armada dari data yang sama dengan grafik Kondisi Armada
    const counts = Object.values(fleetToday);
    const sum = (key: keyof FleetCounts) =>
        counts.reduce((total, c) => total + (c[key] ?? 0), 0);
    const fleet = {
        belum: sum('belum'),
        tidakReady: sum('tidak_ready'),
        sudah: sum('layak') + sum('temuan') + sum('bd'),
        wajib: sum('total') - sum('tidak_ready'),
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="@container/main flex flex-1 flex-col gap-0">
                {/* ── Header + KPI (docs/screens/manager-ops.md · Dashboard) ── */}
                <div className="flex flex-col gap-5 px-4 pt-5 lg:px-6 lg:pt-8">
                    <PageHeader
                        title="Dashboard"
                        description={`${formatDateId()} · ${metrics.total_unit_aktif} unit aktif`}
                        actions={
                            <>
                                <Button asChild variant="outline">
                                    <Link href="/p2h">
                                        <ExternalLink />
                                        Semua P2H
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/p2h/form">
                                        <ClipboardPlus />
                                        Buat P2H
                                    </Link>
                                </Button>
                            </>
                        }
                    />
                    <KpiStrip cols={4}>
                        <KpiCard
                            label="P2H masuk"
                            value={metrics.total_p2h_hari_ini}
                            unit={`/ ${fleet.wajib}`}
                            progress={
                                fleet.wajib > 0
                                    ? (fleet.sudah / fleet.wajib) * 100
                                    : undefined
                            }
                            sub={`${fleet.sudah} dari ${fleet.wajib} unit wajib`}
                        />
                        <KpiCard
                            label="Belum P2H"
                            value={fleet.belum}
                            tone={fleet.belum > 0 ? 'warning' : 'default'}
                            sub={
                                fleet.tidakReady > 0
                                    ? `${fleet.tidakReady} unit tidak Ready`
                                    : 'Semua unit Ready'
                            }
                        />
                        <KpiCard
                            label="Unit ada Tidak Layak"
                            value={metrics.unit_tidak_layak_hari_ini}
                            tone={hasTL ? 'warning' : 'default'}
                            sub="Hari ini"
                        />
                        <KpiCard
                            label="Item kritis Tidak Layak"
                            value={metrics.critical_tidak_layak}
                            tone={hasCritical ? 'danger' : 'default'}
                            sub={
                                hasCritical
                                    ? 'Kode AA — unit Stop'
                                    : 'Tidak ada item kritis'
                            }
                            subTone={hasCritical ? 'danger' : 'default'}
                        />
                    </KpiStrip>
                </div>

                <div className="flex flex-col gap-6 py-5">
                    {/* ── Critical Alert Banner ── */}
                    {hasCritical && !alertDismissed && (
                        <div className="px-4 lg:px-6">
                            <Alert
                                variant="destructive"
                                className="relative border-danger bg-danger-soft"
                            >
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle className="font-semibold">
                                    Peringatan: {metrics.critical_tidak_layak}{' '}
                                    Item Critical Tidak Layak!
                                </AlertTitle>
                                <AlertDescription className="text-sm">
                                    Terdapat item dengan kode bahaya{' '}
                                    <strong>AA (Stop)</strong> yang berstatus
                                    Tidak Layak hari ini. Pastikan unit tidak
                                    dioperasikan sebelum diperbaiki.
                                    <Link
                                        href="/p2h"
                                        className="ml-2 font-medium underline underline-offset-2"
                                    >
                                        Lihat detail →
                                    </Link>
                                </AlertDescription>
                                <button
                                    onClick={() => {
                                        localStorage.setItem(
                                            CRITICAL_ALERT_KEY,
                                            '1',
                                        );
                                        setAlertDismissed(true);
                                    }}
                                    className="absolute top-3 right-3 text-destructive/70 transition-colors hover:text-destructive"
                                    aria-label="Tutup peringatan"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </Alert>
                        </div>
                    )}

                    {/* ── Kondisi armada hari ini ── */}
                    <div className="px-4 lg:px-6">
                        <ErrorBoundary label="kondisi armada">
                            <FleetTodayChart data={fleetToday} />
                        </ErrorBoundary>
                    </div>

                    {/* ── Tren P2H harian & PA mingguan ── */}
                    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
                        <div className="lg:col-span-2">
                            <ErrorBoundary label="grafik tren P2H">
                                <ChartAreaInteractive data={chartData} />
                            </ErrorBoundary>
                        </div>
                        <div className="lg:col-span-1">
                            <ErrorBoundary label="trend PA mingguan">
                                <PAWeeklyTrend data={paWeeklyTrend} />
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
