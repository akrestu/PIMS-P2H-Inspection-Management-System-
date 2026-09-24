import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    Fuel,
    Gauge,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FuelUnit {
    unit_id: number;
    no_unit: string;
    jenis_unit: string;
    jarak: number;
    liter: number;
    jumlah_isi: number;
    km_per_liter: number | null;
    rata_rata_jenis: number | null;
    boros: boolean;
    anomali: {
        tanggal: string;
        liter: number;
        jarak_sejak_isi_sebelumnya: number;
    }[];
}

interface ServiceUnit {
    unit_id: number;
    no_unit: string;
    jenis_unit: string;
    km_saat_ini: number | null;
    km_servis_terakhir: number | null;
    tanggal_servis_terakhir: string | null;
    interval: number;
    km_servis_berikutnya: number | null;
    sisa_km: number | null;
    estimasi_hari: number | null;
    status: 'overdue' | 'due_soon' | 'ok' | 'unknown';
}

interface Filters {
    start: string;
    end: string;
    site_id: number | null;
    jenis_unit: string | null;
}

interface Props {
    fuel: {
        units: FuelUnit[];
        total_liter: number;
        total_jarak: number;
        rata_rata_jenis: Record<string, number>;
        unit_boros: number;
        jumlah_anomali: number;
    };
    service: ServiceUnit[];
    filters: Filters;
    config: {
        interval_km: Record<string, number>;
        due_soon_km: number;
        wasteful_percent: number;
    };
    jenisOptions: string[];
    sites: { id: number; name: string }[];
}

const SERVICE_STATUS: Record<
    ServiceUnit['status'],
    { label: string; className: string }
> = {
    overdue: {
        label: 'Terlambat',
        className:
            'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    },
    due_soon: {
        label: 'Segera',
        className:
            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    },
    ok: {
        label: 'Aman',
        className:
            'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    },
    unknown: {
        label: 'Belum ada data',
        className: 'text-muted-foreground',
    },
};

const num = (v: number | null | undefined, digits = 0) =>
    v === null || v === undefined
        ? '—'
        : v.toLocaleString('id-ID', { maximumFractionDigits: digits });

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UnitAnalytics({
    fuel,
    service,
    filters,
    config,
    jenisOptions,
    sites,
}: Props) {
    const [range, setRange] = useState({
        start: filters.start,
        end: filters.end,
    });

    const applyFilter = (next: Partial<Filters>) => {
        router.get(
            '/unit-analytics',
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true },
        );
    };

    const dueCount = service.filter(
        (s) => s.status === 'overdue' || s.status === 'due_soon',
    ).length;
    const unknownCount = service.filter((s) => s.status === 'unknown').length;

    return (
        <>
            <Head title="Analitik Unit" />
            <div className="flex flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                            <Gauge className="h-6 w-6 text-primary" />
                            Analitik Unit
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Konsumsi BBM dan prediksi servis berkala dari data
                            KM/HM & fuel log P2H
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="start">Dari</Label>
                            <Input
                                id="start"
                                type="date"
                                className="h-9 w-38"
                                value={range.start}
                                onChange={(e) =>
                                    setRange((r) => ({
                                        ...r,
                                        start: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="end">Sampai</Label>
                            <Input
                                id="end"
                                type="date"
                                className="h-9 w-38"
                                value={range.end}
                                onChange={(e) =>
                                    setRange((r) => ({
                                        ...r,
                                        end: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => applyFilter(range)}
                        >
                            Terapkan
                        </Button>
                        <div className="space-y-1.5">
                            <Label>Jenis unit</Label>
                            <Select
                                value={filters.jenis_unit ?? 'all'}
                                onValueChange={(v) =>
                                    applyFilter({
                                        jenis_unit: v === 'all' ? null : v,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua unit
                                    </SelectItem>
                                    {jenisOptions.map((j) => (
                                        <SelectItem key={j} value={j}>
                                            {j}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Site</Label>
                            <Select
                                value={
                                    filters.site_id
                                        ? String(filters.site_id)
                                        : 'all'
                                }
                                onValueChange={(v) =>
                                    applyFilter({
                                        site_id: v === 'all' ? null : Number(v),
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua site
                                    </SelectItem>
                                    {sites.map((s) => (
                                        <SelectItem
                                            key={s.id}
                                            value={String(s.id)}
                                        >
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat
                        icon={Fuel}
                        label="Total BBM"
                        value={`${num(fuel.total_liter, 1)} L`}
                        tone="text-blue-600"
                    />
                    <Stat
                        icon={Gauge}
                        label="Total jarak"
                        value={`${num(fuel.total_jarak)} km`}
                        tone="text-slate-600"
                    />
                    <Stat
                        icon={AlertTriangle}
                        label="Unit boros · isi tidak wajar"
                        value={`${fuel.unit_boros} · ${fuel.jumlah_anomali}`}
                        tone="text-amber-600"
                    />
                    <Stat
                        icon={CalendarClock}
                        label="Servis segera / terlambat"
                        value={dueCount}
                        tone="text-red-600"
                    />
                </div>

                <Tabs defaultValue="fuel">
                    <TabsList>
                        <TabsTrigger value="fuel" className="gap-1.5">
                            <Fuel className="h-4 w-4" /> Konsumsi BBM
                        </TabsTrigger>
                        <TabsTrigger value="service" className="gap-1.5">
                            <Wrench className="h-4 w-4" /> Servis Berkala
                            {dueCount > 0 && (
                                <Badge className="ml-1 h-5 bg-red-600 px-1.5 hover:bg-red-600">
                                    {dueCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Fuel ── */}
                    <TabsContent value="fuel">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-normal text-muted-foreground">
                                    Unit ditandai <b>boros</b> bila km/liter
                                    &lt; {config.wasteful_percent}% rata-rata
                                    jenisnya. Rata-rata:{' '}
                                    {Object.entries(fuel.rata_rata_jenis)
                                        .map(
                                            ([j, v]) =>
                                                `${j} ${num(v, 2)} km/l`,
                                        )
                                        .join(' · ') || '—'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Unit
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Jarak (km)
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    BBM (L)
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Pengisian
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    km/liter
                                                </th>
                                                <th className="px-4 py-3">
                                                    Catatan
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fuel.units.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-4 py-10 text-center text-muted-foreground"
                                                    >
                                                        Belum ada data P2H pada
                                                        periode ini.
                                                    </td>
                                                </tr>
                                            )}
                                            {fuel.units.map((u) => (
                                                <tr
                                                    key={u.unit_id}
                                                    className="align-top"
                                                >
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">
                                                            {u.no_unit}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {u.jenis_unit}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {num(u.jarak)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {num(u.liter, 1)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {u.jumlah_isi}
                                                    </td>
                                                    <td
                                                        className={cn(
                                                            'px-4 py-3 text-right font-medium tabular-nums',
                                                            u.boros &&
                                                                'text-red-600',
                                                        )}
                                                    >
                                                        {num(u.km_per_liter, 2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {u.boros && (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-red-300 text-red-700"
                                                            >
                                                                Boros (rata-rata{' '}
                                                                {num(
                                                                    u.rata_rata_jenis,
                                                                    2,
                                                                )}
                                                                )
                                                            </Badge>
                                                        )}
                                                        {u.anomali.map(
                                                            (a, i) => (
                                                                <p
                                                                    key={i}
                                                                    className="mt-1 text-amber-700 dark:text-amber-400"
                                                                >
                                                                    ⚠️{' '}
                                                                    {a.tanggal}:
                                                                    isi{' '}
                                                                    {num(
                                                                        a.liter,
                                                                        1,
                                                                    )}{' '}
                                                                    L, hanya{' '}
                                                                    {num(
                                                                        a.jarak_sejak_isi_sebelumnya,
                                                                    )}{' '}
                                                                    km sejak isi
                                                                    sebelumnya
                                                                </p>
                                                            ),
                                                        )}
                                                        {!u.boros &&
                                                            u.anomali.length ===
                                                                0 && (
                                                                <span className="text-muted-foreground">
                                                                    {u.km_per_liter ===
                                                                    null
                                                                        ? 'Data BBM/KM belum cukup'
                                                                        : 'Normal'}
                                                                </span>
                                                            )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Service ── */}
                    <TabsContent value="service">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-normal text-muted-foreground">
                                    Interval servis:{' '}
                                    {Object.entries(config.interval_km)
                                        .map(([j, v]) => `${j} ${num(v)} km`)
                                        .join(' · ')}
                                    . Servis terakhir diambil dari P2H yang
                                    mencentang <b>Servis Berkala</b>
                                    {unknownCount > 0 &&
                                        ` · ${unknownCount} unit belum punya catatan servis`}
                                    .
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Unit
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    KM saat ini
                                                </th>
                                                <th className="px-4 py-3">
                                                    Servis terakhir
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Jadwal berikutnya
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Sisa
                                                </th>
                                                <th className="px-4 py-3">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {service.map((s) => (
                                                <tr key={s.unit_id}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">
                                                            {s.no_unit}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {s.jenis_unit}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {num(s.km_saat_ini)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {s.km_servis_terakhir !==
                                                        null
                                                            ? `${num(s.km_servis_terakhir)} km · ${s.tanggal_servis_terakhir}`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {num(
                                                            s.km_servis_berikutnya,
                                                        )}
                                                    </td>
                                                    <td
                                                        className={cn(
                                                            'px-4 py-3 text-right tabular-nums',
                                                            s.status ===
                                                                'overdue' &&
                                                                'font-medium text-red-600',
                                                        )}
                                                    >
                                                        {s.sisa_km !== null
                                                            ? `${num(s.sisa_km)} km`
                                                            : '—'}
                                                        {s.estimasi_hari && (
                                                            <p className="text-xs text-muted-foreground">
                                                                ±
                                                                {
                                                                    s.estimasi_hari
                                                                }{' '}
                                                                hari
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                SERVICE_STATUS[
                                                                    s.status
                                                                ].className
                                                            }
                                                        >
                                                            {
                                                                SERVICE_STATUS[
                                                                    s.status
                                                                ].label
                                                            }
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    tone: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <Icon className={cn('h-8 w-8 shrink-0', tone)} />
                <div className="min-w-0">
                    <p className="text-xl font-bold tabular-nums">{value}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {label}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

UnitAnalytics.layout = {
    breadcrumbs: [{ title: 'Analitik Unit', href: '/unit-analytics' }],
};
