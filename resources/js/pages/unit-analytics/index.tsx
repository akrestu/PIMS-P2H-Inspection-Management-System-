import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ChartColumn, Fuel, Wrench } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/pims/page-header';
import { KritisTag } from '@/components/pims/status-pill';
import { SortableHead, useClientSort } from '@/components/sortable-head';
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
    damage: Damage;
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
        className: 'bg-danger-soft text-danger border-danger/40   ',
    },
    due_soon: {
        label: 'Segera',
        className: 'bg-warning-soft text-warning border-warning/40   ',
    },
    ok: {
        label: 'Aman',
        className: 'bg-success-soft text-success border-success/40   ',
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

// ── Kerusakan (Analitik-Desktop.png) ──────────────────────────────────────────

type Damage = {
    range: { start: string; end: string; label: string };
    total_p2h: number;
    items: { item: string; jumlah: number; kritis: boolean }[];
    weekly: { label: string; kritis: number; non_kritis: number; berjalan: boolean }[];
    units: {
        unit_id: number;
        no_unit: string;
        kerusakan: number;
        downtime: number | null;
        mttr: number | null;
        item_utama: string[];
        tren: number[];
    }[];
};

function Sparkline({ values }: { values: number[] }) {
    const w = 72;
    const h = 24;
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [
        (i / Math.max(1, values.length - 1)) * (w - 4) + 2,
        h - 3 - (v / max) * (h - 6),
    ]);
    const last = pts.at(-1)!;

    return (
        <svg width={w} height={h} aria-hidden className="text-chart-2">
            <polyline
                points={pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />
        </svg>
    );
}

function DamagePanel({ damage }: { damage: Damage }) {
    const [itemFilter, setItemFilter] = useState<string | null>(null);
    const itemMax = Math.max(1, ...damage.items.map((i) => i.jumlah));
    const weekMax = Math.max(1, ...damage.weekly.map((w) => w.kritis + w.non_kritis));
    const units = itemFilter
        ? damage.units.filter((u) => u.item_utama.includes(itemFilter))
        : damage.units;

    return (
        <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-[15px] font-semibold">Item paling sering rusak</h2>
                        <span className="text-xs text-muted-foreground">jumlah temuan</span>
                    </div>
                    {damage.items.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">Belum ada item rusak.</p>
                    ) : (
                        <ul className="mt-3 space-y-1">
                            {damage.items.map((i) => (
                                <li key={i.item}>
                                    <button
                                        type="button"
                                        aria-pressed={itemFilter === i.item}
                                        onClick={() => setItemFilter((v) => (v === i.item ? null : i.item))}
                                        className={cn(
                                            'grid w-full grid-cols-[minmax(0,236px)_1fr_32px] items-center gap-3 rounded-[8px] px-1.5 py-1.5 text-left text-sm hover:bg-muted/60',
                                            itemFilter === i.item && 'bg-muted',
                                        )}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="truncate">{i.item}</span>
                                            {i.kritis && <KritisTag />}
                                        </span>
                                        <span className="h-3.5">
                                            <span
                                                className="block h-full rounded-r-[4px] bg-chart-1"
                                                style={{ width: `${(i.jumlah / itemMax) * 100}%` }}
                                            />
                                        </span>
                                        <span className="text-right font-semibold tnum">{i.jumlah}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                        Klik item untuk memfilter tabel unit di bawah.
                    </p>
                </section>

                <section className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-[15px] font-semibold">Tren kerusakan mingguan</h2>
                        <span className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-[2px] bg-danger" /> Kritis
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-[2px] bg-chart-1" /> Non-kritis
                            </span>
                        </span>
                    </div>
                    <div
                        className="mt-4 flex h-[200px] items-end gap-6 border-b-(length:--bw) px-4"
                        role="img"
                        aria-label={damage.weekly
                            .map((w) => `${w.label}: ${w.kritis} kritis, ${w.non_kritis} non-kritis`)
                            .join('; ')}
                    >
                        {damage.weekly.map((w) => {
                            const total = w.kritis + w.non_kritis;

                            return (
                                <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end">
                                    <span className="mb-1 text-xs font-semibold tnum">{total}</span>
                                    <div
                                        className={cn('flex w-full max-w-11 flex-col gap-[2px]', w.berjalan && 'opacity-70')}
                                        style={{ height: `${(total / weekMax) * 85}%` }}
                                    >
                                        <span className="w-full rounded-t-[3px] bg-chart-1" style={{ flexGrow: w.non_kritis }} />
                                        <span className="w-full bg-danger" style={{ flexGrow: w.kritis }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 flex gap-6 px-4">
                        {damage.weekly.map((w) => (
                            <span key={w.label} className="flex-1 text-center text-xs text-muted-foreground">
                                {w.label}
                            </span>
                        ))}
                    </div>
                    {damage.weekly.at(-1)?.berjalan && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            {damage.weekly.at(-1)?.label} masih berjalan.
                        </p>
                    )}
                </section>
            </div>

            <section>
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.01em]">Unit dengan kerusakan terbanyak</h2>
                    {itemFilter && (
                        <button
                            type="button"
                            onClick={() => setItemFilter(null)}
                            className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
                        >
                            Item: {itemFilter}
                            <span aria-label="Hapus filter">×</span>
                        </button>
                    )}
                </div>
                <div className="mt-3 overflow-x-auto rounded-[14px] border-(length:--bw)">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-muted-2 text-left text-xs text-muted-foreground">
                            <tr className="h-11">
                                <th className="px-4 font-semibold">Unit</th>
                                <th className="px-4 text-right font-semibold">Kerusakan</th>
                                <th className="px-4 text-right font-semibold">Downtime BD</th>
                                <th className="px-4 text-right font-semibold">MTTR</th>
                                <th className="px-4 font-semibold">Item utama</th>
                                <th className="px-4 font-semibold">Tren 4 minggu</th>
                                <th className="px-4">
                                    <span className="sr-only">Aksi</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                                        Tidak ada unit.
                                    </td>
                                </tr>
                            )}
                            {units.map((u) => (
                                <tr key={u.unit_id} className="h-[52px] border-t-(length:--bw)">
                                    <td className="px-4 font-semibold tnum">{u.no_unit}</td>
                                    <td className="px-4 text-right font-semibold tnum">{u.kerusakan}</td>
                                    <td className="px-4 text-right tnum">{u.downtime === null ? '—' : `${num(u.downtime, 1)} j`}</td>
                                    <td className="px-4 text-right text-muted-foreground tnum">{u.mttr === null ? '—' : `${num(u.mttr, 1)} j`}</td>
                                    <td className="max-w-[280px] truncate px-4 text-muted-foreground">{u.item_utama.join(' · ')}</td>
                                    <td className="px-4">
                                        <Sparkline values={u.tren} />
                                    </td>
                                    <td className="px-4 text-right">
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/p2h?no_unit=${encodeURIComponent(u.no_unit)}`}>Riwayat</Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UnitAnalytics({
    damage,
    fuel,
    service,
    filters,
    config,
    jenisOptions,
    sites,
}: Props) {
    const fuelSort = useClientSort(
        fuel.units,
        {
            unit: (u) => u.no_unit,
            jarak: (u) => u.jarak,
            liter: (u) => u.liter,
            jumlah_isi: (u) => u.jumlah_isi,
            km_per_liter: (u) => u.km_per_liter,
        },
        { by: 'unit', dir: 'asc' },
    );
    const serviceSort = useClientSort(
        service,
        {
            unit: (s) => s.no_unit,
            km_saat_ini: (s) => s.km_saat_ini,
            servis_terakhir: (s) => s.tanggal_servis_terakhir,
            km_servis_berikutnya: (s) => s.km_servis_berikutnya,
            sisa_km: (s) => s.sisa_km,
            status: (s) => s.status,
        },
        { by: 'unit', dir: 'asc' },
    );
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
            <Head title="Analitik unit" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <PageHeader
                    title="Analitik unit"
                    description={`5 minggu terakhir (${damage.range.label}) · dari ${num(damage.total_p2h)} P2H`}
                />
                <div className="-mt-1 flex flex-col gap-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="start">Dari</Label>
                            <Input
                                id="start"
                                type="date"
                                className="w-38"
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
                                className="w-38"
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
                                <SelectTrigger className="w-40">
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
                                <SelectTrigger className="w-40">
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

                <Tabs defaultValue="damage">
                    <TabsList>
                        <TabsTrigger value="damage" className="gap-1.5">
                            <ChartColumn className="h-4 w-4" /> Kerusakan
                        </TabsTrigger>
                        <TabsTrigger value="fuel" className="gap-1.5">
                            <Fuel className="h-4 w-4" /> Konsumsi BBM
                        </TabsTrigger>
                        <TabsTrigger value="service" className="gap-1.5">
                            <Wrench className="h-4 w-4" /> Servis Berkala
                            {dueCount > 0 && (
                                <Badge className="ml-1 h-5 bg-danger px-1.5 hover:bg-danger">
                                    {dueCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="damage">
                        <DamagePanel damage={damage} />
                    </TabsContent>

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
                                {/* Mobile: kartu per unit */}
                                <div className="divide-y border-t md:hidden">
                                    {fuel.units.length === 0 && (
                                        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                                            Belum ada data P2H pada periode ini.
                                        </p>
                                    )}
                                    {fuelSort.rows.map((u) => (
                                        <div
                                            key={u.unit_id}
                                            className="space-y-2 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">
                                                        {u.no_unit}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {u.jenis_unit}
                                                    </p>
                                                </div>
                                                <p
                                                    className={cn(
                                                        'text-right font-semibold tabular-nums',
                                                        u.boros &&
                                                            'text-danger',
                                                    )}
                                                >
                                                    {num(u.km_per_liter, 2)}
                                                    <span className="block text-xs font-normal text-muted-foreground">
                                                        km/liter
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Jarak
                                                    </p>
                                                    <p className="tabular-nums">
                                                        {num(u.jarak)} km
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        BBM
                                                    </p>
                                                    <p className="tabular-nums">
                                                        {num(u.liter, 1)} L
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Pengisian
                                                    </p>
                                                    <p className="tabular-nums">
                                                        {u.jumlah_isi}x
                                                    </p>
                                                </div>
                                            </div>
                                            {u.boros && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-danger/40 text-danger"
                                                >
                                                    Boros (rata-rata{' '}
                                                    {num(u.rata_rata_jenis, 2)})
                                                </Badge>
                                            )}
                                            {u.anomali.map((a, i) => (
                                                <p
                                                    key={i}
                                                    className="text-xs text-warning"
                                                >
                                                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                                    {a.tanggal}: isi{' '}
                                                    {num(a.liter, 1)} L, hanya{' '}
                                                    {num(
                                                        a.jarak_sejak_isi_sebelumnya,
                                                    )}{' '}
                                                    km sejak isi sebelumnya
                                                </p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                                            <tr>
                                                <SortableHead
                                                    column="unit"
                                                    plain
                                                    sort={fuelSort.sort}
                                                    onSort={fuelSort.onSort}
                                                    className="px-4 py-3"
                                                >
                                                    Unit
                                                </SortableHead>
                                                <SortableHead
                                                    column="jarak"
                                                    descFirst
                                                    plain
                                                    sort={fuelSort.sort}
                                                    onSort={fuelSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    Jarak (km)
                                                </SortableHead>
                                                <SortableHead
                                                    column="liter"
                                                    descFirst
                                                    plain
                                                    sort={fuelSort.sort}
                                                    onSort={fuelSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    BBM (L)
                                                </SortableHead>
                                                <SortableHead
                                                    column="jumlah_isi"
                                                    descFirst
                                                    plain
                                                    sort={fuelSort.sort}
                                                    onSort={fuelSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    Pengisian
                                                </SortableHead>
                                                <SortableHead
                                                    column="km_per_liter"
                                                    descFirst
                                                    plain
                                                    sort={fuelSort.sort}
                                                    onSort={fuelSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    km/liter
                                                </SortableHead>
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
                                            {fuelSort.rows.map((u) => (
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
                                                                'text-danger',
                                                        )}
                                                    >
                                                        {num(u.km_per_liter, 2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {u.boros && (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-danger/40 text-danger"
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
                                                                    className="mt-1 text-warning"
                                                                >
                                                                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
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
                                {/* Mobile: kartu per unit */}
                                <div className="divide-y border-t md:hidden">
                                    {serviceSort.rows.map((s) => (
                                        <div
                                            key={s.unit_id}
                                            className="space-y-2 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">
                                                        {s.no_unit}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {s.jenis_unit}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        SERVICE_STATUS[s.status]
                                                            .className
                                                    }
                                                >
                                                    {
                                                        SERVICE_STATUS[s.status]
                                                            .label
                                                    }
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        KM saat ini
                                                    </p>
                                                    <p className="tabular-nums">
                                                        {num(s.km_saat_ini)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Jadwal
                                                    </p>
                                                    <p className="tabular-nums">
                                                        {num(
                                                            s.km_servis_berikutnya,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Sisa
                                                    </p>
                                                    <p
                                                        className={cn(
                                                            'tabular-nums',
                                                            s.status ===
                                                                'overdue' &&
                                                                'font-medium text-danger',
                                                        )}
                                                    >
                                                        {s.sisa_km !== null
                                                            ? `${num(s.sisa_km)} km`
                                                            : '—'}
                                                        {s.estimasi_hari &&
                                                            ` · ±${s.estimasi_hari} hari`}
                                                    </p>
                                                </div>
                                            </div>
                                            {s.km_servis_terakhir !== null && (
                                                <p className="text-xs text-muted-foreground">
                                                    Servis terakhir:{' '}
                                                    {num(s.km_servis_terakhir)}{' '}
                                                    km ·{' '}
                                                    {s.tanggal_servis_terakhir}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                                            <tr>
                                                <SortableHead
                                                    column="unit"
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3"
                                                >
                                                    Unit
                                                </SortableHead>
                                                <SortableHead
                                                    column="km_saat_ini"
                                                    descFirst
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    KM saat ini
                                                </SortableHead>
                                                <SortableHead
                                                    column="servis_terakhir"
                                                    descFirst
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3"
                                                >
                                                    Servis terakhir
                                                </SortableHead>
                                                <SortableHead
                                                    column="km_servis_berikutnya"
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    Jadwal berikutnya
                                                </SortableHead>
                                                <SortableHead
                                                    column="sisa_km"
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3 text-right"
                                                >
                                                    Sisa
                                                </SortableHead>
                                                <SortableHead
                                                    column="status"
                                                    plain
                                                    sort={serviceSort.sort}
                                                    onSort={serviceSort.onSort}
                                                    className="px-4 py-3"
                                                >
                                                    Status
                                                </SortableHead>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {serviceSort.rows.map((s) => (
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
                                                                'font-medium text-danger',
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

UnitAnalytics.layout = {
    breadcrumbs: [{ title: 'Analitik Unit', href: '/unit-analytics' }],
};
