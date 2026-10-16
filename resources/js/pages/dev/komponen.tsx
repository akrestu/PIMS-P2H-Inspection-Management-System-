import { Head } from '@inertiajs/react';
import { Download, Filter, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { BulkAction, BulkBar } from '@/components/pims/bulk-bar';
import { ChartCard, ChartLegend } from '@/components/pims/chart-card';
import {
    ConfirmTypeDelete,
    ReasonDialog,
} from '@/components/pims/confirm-dialogs';
import { ActiveFilters, FilterChips } from '@/components/pims/filter-chips';
import { FormField } from '@/components/pims/form-field';
import { KpiCard, KpiStrip } from '@/components/pims/kpi';
import { ListCard } from '@/components/pims/list-card';
import { PageHeader, SectionHeader } from '@/components/pims/page-header';
import { ChecklistProgress, Timeline } from '@/components/pims/progress';
import { ResponsiveDrawer } from '@/components/pims/responsive-drawer';
import type { ItemResult } from '@/components/pims/segmented';
import { Segmented, SegmentedChoice } from '@/components/pims/segmented';
import {
    EmptyState,
    ErrorState,
    Forbidden,
    OfflineBanner,
} from '@/components/pims/states';
import type { StatusKey } from '@/components/pims/status-pill';
import {
    KritisTag,
    STATUS_META,
    StatusPill,
} from '@/components/pims/status-pill';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toastUndo } from '@/components/ui/sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useMotionPreference } from '@/hooks/use-appearance';
import { formatDuration, formatHM, formatPercent } from '@/lib/format';

/** Halaman cek visual komponen (meniru pims-redesign/design/screens/Komponen.png). Hanya env local. */

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-6 border-t py-10 lg:grid-cols-[240px_1fr]">
            <div>
                <h2 className="text-xl font-semibold tracking-[-0.01em]">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
            <div className="min-w-0 space-y-6">{children}</div>
        </section>
    );
}

const CHECKLIST: { name: string; critical: boolean }[] = [
    { name: 'Rem utama', critical: true },
    { name: 'Lampu utama', critical: false },
    { name: 'Kebocoran oli / BBM', critical: true },
];

const ROWS: {
    unit: string;
    type: string;
    driver: string;
    p2h: StatusKey;
    approval: 'menunggu' | 'eskalasi' | null;
    status: StatusKey;
}[] = [
    {
        unit: 'DT-1045',
        type: 'Dump Truck',
        driver: 'Budi S.',
        p2h: 'layak',
        approval: 'menunggu',
        status: 'ready',
    },
    {
        unit: 'EX-2003',
        type: 'Excavator',
        driver: 'Dedi K.',
        p2h: 'tidak-layak',
        approval: 'eskalasi',
        status: 'bd',
    },
    {
        unit: 'LV-034',
        type: 'Light Vehicle',
        driver: 'Rudi H.',
        p2h: 'belum',
        approval: null,
        status: 'ready',
    },
    {
        unit: 'GR-012',
        type: 'Motor Grader',
        driver: '—',
        p2h: 'belum',
        approval: null,
        status: 'pm',
    },
];

export default function Komponen() {
    const { motion, updateMotion } = useMotionPreference();
    const [answers, setAnswers] = useState<Record<string, ItemResult | null>>({
        'Rem utama': 'baik',
        'Lampu utama': null,
        'Kebocoran oli / BBM': 'rusak',
    });
    const [range, setRange] = useState<'7' | '30' | '90'>('30');
    const [chip, setChip] = useState<
        'semua' | 'belum' | 'tidak-layak' | 'menunggu'
    >('semua');
    const [selected, setSelected] = useState<string[]>([]);
    const [selectMode, setSelectMode] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [reason, setReason] = useState(false);
    const [purge, setPurge] = useState(false);
    const [kpiFilter, setKpiFilter] = useState<string | null>(null);

    const toggle = (unit: string) =>
        setSelected((s) =>
            s.includes(unit) ? s.filter((u) => u !== unit) : [...s, unit],
        );

    return (
        <>
            <Head title="Komponen" />
            <main className="mx-auto max-w-[1200px] px-4 pb-32 lg:px-10">
                <div className="flex flex-col gap-4 py-10 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            PIMS Design System · Komponen inti
                        </p>
                        <h1 className="mt-2 text-[32px] leading-9 font-semibold tracking-[-0.03em] lg:text-5xl lg:leading-[52px]">
                            Komponen &amp; state
                        </h1>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                        <AppearanceToggleTab />
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={motion === 'reduced'}
                                onCheckedChange={(v) =>
                                    updateMotion(
                                        v === true ? 'reduced' : 'system',
                                    )
                                }
                            />
                            Kurangi gerakan
                        </label>
                    </div>
                </div>

                <Section
                    title="Button"
                    description="Tinggi 56 (CTA mobile), 48 default → 40 desktop. Brand kuning maksimal satu per layar."
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <Button>Kirim P2H</Button>
                        <Button variant="brand">Isi P2H</Button>
                        <Button variant="outline">Unduh PDF</Button>
                        <Button variant="ghost">Batal</Button>
                        <Button variant="destructive">Hapus</Button>
                        <Button variant="link">Lihat semua</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button disabled>Nonaktif</Button>
                        <Button variant="brand" disabled>
                            Nonaktif
                        </Button>
                        <Button loading>Memproses</Button>
                        <Button variant="outline" loading>
                            Memproses
                        </Button>
                        <Button size="sm" variant="outline">
                            Tinjau
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Unduh"
                        >
                            <Download />
                        </Button>
                    </div>
                    <div className="max-w-sm">
                        <Button variant="brand" size="xl" className="w-full">
                            Isi P2H sekarang
                        </Button>
                    </div>
                </Section>

                <Section
                    title="Kontrol form"
                    description="Segmented Baik/Rusak 52px. Input 52 mobile / 44 desktop, font 16 di mobile."
                >
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-5">
                            {CHECKLIST.map((item) => (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 text-[17px] font-medium">
                                            {item.name}
                                            {item.critical && <KritisTag />}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {answers[item.name]
                                                ? 'Dijawab'
                                                : 'Belum dijawab'}
                                        </span>
                                    </div>
                                    <SegmentedChoice
                                        label={item.name}
                                        value={answers[item.name]}
                                        invalid={answers[item.name] === null}
                                        onChange={(v) =>
                                            setAnswers((a) => ({
                                                ...a,
                                                [item.name]: v,
                                            }))
                                        }
                                    />
                                    {answers[item.name] === null && (
                                        <p className="text-[13px] font-medium text-danger">
                                            Item ini belum dijawab
                                        </p>
                                    )}
                                </div>
                            ))}
                            <Segmented
                                label="Rentang"
                                value={range}
                                onChange={setRange}
                                options={[
                                    { value: '7', label: '7 hari' },
                                    { value: '30', label: '30 hari' },
                                    { value: '90', label: '90 hari' },
                                ]}
                            />
                        </div>
                        <div className="space-y-4">
                            <FormField label="Kode unit">
                                <Input placeholder="Cari kode unit" />
                            </FormField>
                            <FormField
                                label="HM awal"
                                hint="+0,5 jam sejak P2H terakhir"
                            >
                                <Input
                                    inputMode="decimal"
                                    defaultValue={formatHM(12481)}
                                />
                            </FormField>
                            <FormField
                                label="HM awal"
                                error="HM tidak boleh lebih kecil dari 12.480,5"
                            >
                                <Input
                                    inputMode="decimal"
                                    defaultValue="12.400"
                                />
                            </FormField>
                            <FormField label="HM akhir">
                                <Input
                                    disabled
                                    placeholder="Diisi saat akhir shift"
                                />
                            </FormField>
                        </div>
                    </div>
                </Section>

                <Section
                    title="Status, badge, chip"
                    description="Pill lembut + titik + label. KRITIS selalu merah solid."
                >
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_META) as StatusKey[]).map((k) => (
                            <StatusPill key={k} status={k} />
                        ))}
                        <StatusPill status="tidak-layak" solid />
                        <KritisTag withIcon />
                    </div>
                    <FilterChips
                        label="Filter status P2H"
                        value={chip}
                        onChange={setChip}
                        options={[
                            { value: 'semua', label: 'Semua', count: 11 },
                            { value: 'belum', label: 'Belum P2H', count: 3 },
                            {
                                value: 'tidak-layak',
                                label: 'Tidak Layak',
                                count: 2,
                            },
                            {
                                value: 'menunggu',
                                label: 'Menunggu setuju',
                                count: 4,
                            },
                        ]}
                    />
                    <ActiveFilters
                        items={[
                            { key: 'site', label: 'Pit A' },
                            { key: 'status', label: 'Overdue' },
                        ]}
                        onRemove={(k) => toast('Filter ' + k + ' dihapus')}
                        onReset={() => toast('Filter direset')}
                    />
                </Section>

                <Section
                    title="Tabel & aksi massal"
                    description="Header muted-2 44px, baris 52px, baris terpilih brand-soft, bulk bar gelap mengambang."
                >
                    <PageHeader
                        title="Status P2H hari ini"
                        description="Pit A · Jumat, 16 Okt 2026 · Shift 1"
                        actions={
                            <Button variant="outline">
                                <Download /> Export
                            </Button>
                        }
                    />
                    <TableContainer>
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Checkbox
                                            aria-label="Pilih semua"
                                            checked={
                                                selected.length === ROWS.length
                                            }
                                            onCheckedChange={(v) =>
                                                setSelected(
                                                    v === true
                                                        ? ROWS.map(
                                                              (r) => r.unit,
                                                          )
                                                        : [],
                                                )
                                            }
                                        />
                                    </TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>P2H</TableHead>
                                    <TableHead>Persetujuan</TableHead>
                                    <TableHead>Status unit</TableHead>
                                    <TableHead>
                                        <span className="sr-only">Aksi</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ROWS.map((r) => (
                                    <TableRow
                                        key={r.unit}
                                        data-state={
                                            selected.includes(r.unit)
                                                ? 'selected'
                                                : undefined
                                        }
                                    >
                                        <TableCell>
                                            <Checkbox
                                                aria-label={'Pilih ' + r.unit}
                                                checked={selected.includes(
                                                    r.unit,
                                                )}
                                                onCheckedChange={() =>
                                                    toggle(r.unit)
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            {r.unit}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {r.type}
                                        </TableCell>
                                        <TableCell>{r.driver}</TableCell>
                                        <TableCell>
                                            <StatusPill status={r.p2h} />
                                        </TableCell>
                                        <TableCell
                                            className={
                                                r.approval === 'eskalasi'
                                                    ? 'text-danger'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            {r.approval === 'menunggu'
                                                ? 'Menunggu · 26 mnt'
                                                : r.approval === 'eskalasi'
                                                  ? 'Eskalasi · 31 mnt'
                                                  : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <StatusPill status={r.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDrawer(true)}
                                            >
                                                {r.p2h === 'belum'
                                                    ? 'Ingatkan'
                                                    : 'Tinjau'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <BulkBar
                        count={selected.length}
                        onClear={() => setSelected([])}
                    >
                        <BulkAction>
                            <Download /> Export
                        </BulkAction>
                        <BulkAction
                            tone="danger"
                            onClick={() => setPurge(true)}
                        >
                            <Trash2 /> Hapus
                        </BulkAction>
                        <BulkAction tone="primary">Setujui</BulkAction>
                    </BulkBar>
                </Section>

                <Section
                    title="List card & sheet"
                    description="Ketuk = detail. Tekan lama 450ms = mode pilih. Drawer kanan di desktop, bottom sheet di mobile."
                >
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-2">
                            <SectionHeader
                                title="Persetujuan"
                                meta="4 menunggu"
                            />
                            {ROWS.slice(0, 3).map((r) => (
                                <ListCard
                                    key={r.unit}
                                    title={r.unit}
                                    meta={'Shift 1 · 05:48 · ' + r.driver}
                                    trailing={
                                        <StatusPill status={r.p2h} size="sm" />
                                    }
                                    onOpen={() => setDrawer(true)}
                                    onSelectMode={() => {
                                        setSelectMode(true);
                                        toggle(r.unit);
                                    }}
                                    selectable={selectMode}
                                    selected={selected.includes(r.unit)}
                                    onSelectedChange={() => toggle(r.unit)}
                                    selectLabel={'Pilih ' + r.unit}
                                />
                            ))}
                            {selectMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectMode(false)}
                                >
                                    Selesai memilih
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap content-start gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDrawer(true)}
                            >
                                <Filter /> Buka drawer / sheet
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setReason(true)}
                            >
                                Tolak (ReasonDialog)
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setPurge(true)}
                            >
                                Hapus permanen
                            </Button>
                        </div>
                    </div>
                </Section>

                <Section
                    title="Feedback & keadaan layar"
                    description="Setiap layar data punya 5 keadaan: memuat, kosong, error, offline, 403."
                >
                    <OfflineBanner queued={3} lastSync="06:02" />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                toastUndo('Temuan T-0228 ditutup', () =>
                                    toast('Dibatalkan'),
                                )
                            }
                        >
                            Toast + Urungkan
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                toast.error('Gagal menyimpan. Periksa sinyal.')
                            }
                        >
                            Toast error
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => toast.success('P2H disetujui')}
                        >
                            Toast sukses
                        </Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div
                            className="space-y-3 rounded-xl border-(length:--bw) p-4"
                            aria-busy
                        >
                            <div className="h-5 w-1/3 skeleton" />
                            <div className="h-14 skeleton" />
                            <div className="h-14 skeleton" />
                        </div>
                        <EmptyState
                            title="Tidak ada temuan terbuka"
                            description="Semua temuan Pit A sudah ditutup. Bagus."
                        />
                        <ErrorState
                            code={504}
                            onRetry={() => toast('Memuat ulang…')}
                        />
                        <Forbidden description="Akun Manager tidak bisa membuka Audit Log. Minta akses ke admin." />
                    </div>
                </Section>

                <Section
                    title="KPI, timeline, stepper"
                    description="Angka 36–40 tanpa kartu di mobile, kartu 28 di desktop. Selalu tabular."
                >
                    <KpiStrip cols={5}>
                        <KpiCard
                            label="P2H masuk"
                            value={42}
                            unit="/ 48"
                            sub={formatPercent(87.5) + ' · 40 Layak'}
                            progress={87.5}
                        />
                        <KpiCard
                            label="Belum P2H"
                            value={6}
                            sub="batas 06:30 · 18 mnt"
                            subTone="warning"
                            onClick={() =>
                                setKpiFilter((f) =>
                                    f === 'belum' ? null : 'belum',
                                )
                            }
                            active={kpiFilter === 'belum'}
                        />
                        <KpiCard
                            label="Tidak Layak"
                            value={2}
                            tone="danger"
                            sub="DT-1050 · EX-2003"
                        />
                        <KpiCard
                            label="Temuan open"
                            value={12}
                            sub="3 lewat tenggat"
                            subTone="danger"
                        />
                        <KpiCard
                            label="PA hari ini"
                            value="85,4"
                            unit="%"
                            sub="▲ 1,2 poin vs kemarin"
                            subTone="success"
                        />
                    </KpiStrip>
                    <KpiStrip>
                        <KpiCard
                            variant="plain"
                            label="P2H masuk"
                            value={42}
                            unit="/48"
                            sub="batas 06:30 · 18 mnt"
                            subTone="warning"
                        />
                        <KpiCard
                            variant="plain"
                            label="Kepatuhan 7 hari"
                            value="91"
                            unit="%"
                            sub="▲ 3 poin"
                            subTone="success"
                        />
                    </KpiStrip>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Timeline
                            steps={[
                                {
                                    title: 'P2H dikirim',
                                    meta: 'Budi S. · 05:48',
                                    state: 'done',
                                },
                                {
                                    title: 'Menunggu Hendra W.',
                                    meta: 'Pengawas · 05:48',
                                    state: 'current',
                                },
                                {
                                    title: 'Eskalasi ke semua Manager site',
                                    meta:
                                        'Otomatis · 06:03 (' +
                                        formatDuration(15) +
                                        ')',
                                    state: 'danger',
                                },
                                {
                                    title: 'Disetujui',
                                    meta: 'Hendra W. · 06:21',
                                    state: 'upcoming',
                                },
                            ]}
                        />
                        <ChecklistProgress
                            step={2}
                            totalSteps={6}
                            done={12}
                            total={18}
                        />
                    </div>
                    <ChartCard
                        title="Tren kepatuhan · 30 hari"
                        meta="rata-rata 91,4% · target 95%"
                        summary="Contoh kartu chart: kepatuhan 30 hari rata-rata 91,4 persen."
                        legend={
                            <ChartLegend
                                items={[
                                    { label: 'Kepatuhan', color: 'chart-1' },
                                    {
                                        label: 'Target 95%',
                                        color: 'chart-ref',
                                        dashed: true,
                                    },
                                ]}
                            />
                        }
                        note="Chart Recharts dirender di tiap modul (Fase 4–5)."
                    >
                        <div className="flex h-40 items-end gap-1.5">
                            {[
                                82, 88, 91, 86, 94, 97, 90, 92, 95, 89, 93, 96,
                            ].map((v, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded-t-[4px] bg-chart-1"
                                    style={{ height: v - 60 + '%' }}
                                />
                            ))}
                        </div>
                    </ChartCard>
                </Section>
            </main>

            <ResponsiveDrawer
                open={drawer}
                onOpenChange={setDrawer}
                title="DT-1045 · Shift 1"
                description="Jumat, 16 Okt 2026 · Budi Santoso"
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setDrawer(false)}
                        >
                            Batal
                        </Button>
                        <Button onClick={() => setDrawer(false)}>
                            Setujui
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <StatusPill status="layak" />
                    <p className="text-sm text-muted-foreground">
                        HM {formatHM(12480.5)} · BBM ¾ · 18 dari 18 item Baik.
                    </p>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 skeleton" />
                    ))}
                </div>
            </ResponsiveDrawer>
            <ReasonDialog
                open={reason}
                onOpenChange={setReason}
                title="Tolak P2H DT-1045?"
                description="Driver diberi tahu dan diminta mengisi ulang."
                quickReasons={[
                    'Foto tidak jelas',
                    'HM tidak sesuai',
                    'Item belum dicek',
                    'Unit salah',
                ]}
                confirmLabel="Tolak P2H"
                onConfirm={(r) => {
                    setReason(false);
                    toastUndo(
                        'P2H DT-1045 ditolak',
                        () => toast('Dibatalkan'),
                        r,
                    );
                }}
            />
            <ConfirmTypeDelete
                open={purge}
                onOpenChange={setPurge}
                title="Hapus permanen 3 unit?"
                description="Riwayat P2H tetap tersimpan, tapi unit tidak bisa dipulihkan."
                onConfirm={() => {
                    setPurge(false);
                    toast.success('3 unit dihapus permanen');
                }}
            />
        </>
    );
}
