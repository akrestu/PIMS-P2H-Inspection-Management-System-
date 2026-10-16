import { Head, router, useHttp } from '@inertiajs/react';
import {
    ClipboardCopy,
    FileDown,
    RotateCcw,
    Send,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    generateAi,
    pdf,
} from '@/actions/App/Http/Controllers/P2hPeriodReportController';
import type { TrendPoint } from '@/components/pims/compliance-trend';
import { ComplianceTrend } from '@/components/pims/compliance-trend';
import { PageHeader } from '@/components/pims/page-header';
import { Segmented } from '@/components/pims/segmented';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClipboard } from '@/hooks/use-clipboard';
import { useWhatsAppShare } from '@/hooks/use-whatsapp-share';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Period =
    | 'last_7'
    | 'last_30'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'custom';

interface Report {
    periode: {
        mulai: string;
        selesai: string;
        label: string;
        jumlah_hari: number;
    };
    site: string | null;
    kepatuhan: {
        unit_aktif: number;
        p2h_masuk: number;
        p2h_seharusnya: number;
        persen: number | null;
    };
    temuan: {
        total: number;
        kode_aa: number;
        closed: number;
        progress: number;
        open: number;
        rata_rata_hari_penyelesaian: number | null;
        tanpa_pic: number;
    };
    item_teratas: { item: string; jumlah: number }[];
    unit_teratas: {
        no_unit: string;
        jenis_unit: string;
        jumlah: number;
        belum_selesai: number;
    }[];
    berulang: { no_unit: string; item: string; jumlah: number }[];
    overdue: {
        no_unit: string;
        item: string;
        pic: string | null;
        hari_terlambat: number;
    }[];
}

interface Filters {
    period: Period;
    start: string;
    end: string;
    site_id: number | null;
    jenis_unit: string | null;
}

interface PeriodTotals {
    kepatuhan: number | null;
    p2h: number;
    wajib: number;
    tidak_layak: number;
    temuan: number;
    temuan_closed: number;
    temuan_open: number;
    pa: number | null;
    downtime_jam: number;
    bd_persen: number | null;
}

/** App\Support\PeriodReportCharts::build() */
interface Charts {
    totals: PeriodTotals;
    previous: PeriodTotals;
    daily: TrendPoint[];
    weekly: { label: string; dibuka: number; ditutup: number }[];
    sites: { name: string; kepatuhan: number | null; p2h: number; tidak_layak: number; pa: number | null }[];
}

interface Props {
    report: Report;
    charts: Charts;
    template: string;
    filters: Filters;
    jenisOptions: string[];
    sites: { id: number; name: string }[];
    aiEnabled: boolean;
}

interface AiResponse {
    text: string;
    fallback: boolean;
    message?: string;
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function PeriodReport({
    report,
    charts,
    template,
    filters,
    jenisOptions,
    sites,
    aiEnabled,
}: Props) {
    const [text, setText] = useState(template);
    const [source, setSource] = useState<'template' | 'ai'>('template');
    const [, copy] = useClipboard();
    const { share } = useWhatsAppShare();
    const http = useHttp<Filters, AiResponse>({ ...filters });

    const query = {
        ...filters,
        site_id: filters.site_id ?? undefined,
        jenis_unit: filters.jenis_unit ?? undefined,
    };

    // preserveState: false → halaman di-mount ulang, teks kembali ke template terbaru
    const applyFilter = (next: Partial<Filters>) => {
        router.get(
            '/p2h/period-report',
            { ...filters, ...next },
            { preserveState: false, preserveScroll: true },
        );
    };

    const handleAi = async () => {
        try {
            const res = await http.submit(generateAi());
            setText(res.text);
            setSource(res.fallback ? 'template' : 'ai');

            if (res.fallback) {
                toast.warning('Analisis AI tidak tersedia', {
                    description: res.message,
                });
            } else {
                toast.success('Laporan dianalisis oleh AI', {
                    description: 'Periksa kembali sebelum dikirim.',
                });
            }
        } catch {
            toast.error('Gagal menghubungi server');
        }
    };

    const handleCopy = async () => {
        if (await copy(text)) {
            toast.success('Laporan disalin', {
                description: 'Tempelkan di grup WhatsApp.',
            });
        } else {
            toast.error('Gagal menyalin ke clipboard');
        }
    };

    const setRange = (v: string) => applyFilter({ period: v as Period });

    const t = charts.totals;
    const p = charts.previous;
    const delta = (a: number | null, b: number | null) =>
        a === null || b === null ? null : Math.round((a - b) * 10) / 10;
    const kepDelta = delta(t.kepatuhan, p.kepatuhan);
    const paDelta = delta(t.pa, p.pa);
    const tlDelta = p.p2h > 0 ? t.tidak_layak - p.tidak_layak : null;

    const deltaText = (d: number | null, unit: string) =>
        d === null ? null : `${d >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(d))}${unit}`;

    const kpis = [
        {
            label: 'Kepatuhan rata-rata',
            value: formatPercent(t.kepatuhan),
            sub: deltaText(kepDelta, ' poin') ?? `target 95%`,
            subTone: kepDelta === null ? '' : kepDelta >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold',
        },
        {
            label: 'P2H tercatat',
            value: formatNumber(t.p2h, 0),
            sub: `dari ${formatNumber(t.wajib, 0)} wajib`,
            subTone: '',
        },
        {
            label: 'Tidak Layak',
            value: formatNumber(t.tidak_layak, 0),
            sub: tlDelta === null ? 'sesi hasil BD' : `${tlDelta <= 0 ? '▼' : '▲'} ${Math.abs(tlDelta)} vs periode lalu`,
            subTone: tlDelta === null ? '' : tlDelta <= 0 ? 'text-success font-semibold' : 'text-danger font-semibold',
        },
        {
            label: 'Temuan dibuka',
            value: formatNumber(t.temuan, 0),
            sub: `${t.temuan_closed} ditutup · ${t.temuan_open} open`,
            subTone: '',
        },
        {
            label: 'PA rata-rata',
            value: formatPercent(t.pa),
            sub: deltaText(paDelta, ' poin') ?? 'target 90%',
            subTone: paDelta === null ? '' : paDelta >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold',
        },
        {
            label: 'Downtime',
            value: `${formatNumber(t.downtime_jam)} j`,
            sub: t.bd_persen === null ? 'tidak ada downtime' : `BD ${formatPercent(t.bd_persen)}`,
            subTone: '',
        },
    ];

    const weeklyMax = Math.max(1, ...charts.weekly.flatMap((w) => [w.dibuka, w.ditutup]));

    return (
        <>
            <Head title="Laporan periode" />
            <div className="flex flex-col gap-6 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Laporan periode"
                    description={[
                        report.periode.label,
                        report.site ?? 'Semua site',
                        filters.jenis_unit,
                        'dibanding periode sebelumnya',
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                    actions={
                        <>
                            <Segmented
                                label="Rentang laporan"
                                value={filters.period}
                                onChange={setRange}
                                options={[
                                    { value: 'last_7', label: '7 hari' },
                                    { value: 'last_30', label: '30 hari' },
                                    { value: 'this_month', label: 'Bulan ini' },
                                    { value: 'last_month', label: 'Bulan lalu' },
                                ]}
                            />
                            <Button asChild>
                                <a href={pdf.url({ query })}>
                                    <FileDown />
                                    Unduh PDF
                                </a>
                            </Button>
                        </>
                    }
                />

                <div className="-mt-2 flex flex-wrap gap-2">
                    <Select
                        value={filters.jenis_unit ?? 'all'}
                        onValueChange={(v) => applyFilter({ jenis_unit: v === 'all' ? null : v })}
                    >
                        <SelectTrigger aria-label="Jenis unit" className="h-10 w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua unit</SelectItem>
                            {jenisOptions.map((j) => (
                                <SelectItem key={j} value={j}>
                                    {j}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {sites.length > 1 && (
                        <Select
                            value={filters.site_id ? String(filters.site_id) : 'all'}
                            onValueChange={(v) => applyFilter({ site_id: v === 'all' ? null : Number(v) })}
                        >
                            <SelectTrigger aria-label="Site" className="h-10 w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua site</SelectItem>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={String(site.id)}>
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <section
                    aria-label="Ringkasan periode"
                    className="grid grid-cols-2 gap-x-6 gap-y-5 border-b-(length:--bw) pb-6 md:grid-cols-3 xl:grid-cols-6"
                >
                    {kpis.map((k) => (
                        <div key={k.label} className="min-w-0">
                            <p className="text-[13px] text-muted-foreground">{k.label}</p>
                            <p className="mt-1 text-[32px] leading-none font-semibold tracking-[-0.03em] tnum">
                                {k.value}
                            </p>
                            <p className={cn('mt-2 truncate text-[13px] text-muted-foreground', k.subTone)}>
                                {k.sub}
                            </p>
                        </div>
                    ))}
                </section>

                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <section aria-labelledby="harian-title">
                        <div className="flex items-baseline gap-2">
                            <h2 id="harian-title" className="text-lg font-semibold tracking-[-0.01em]">
                                Kepatuhan harian
                            </h2>
                            <span className="text-xs text-muted-foreground">garis putus = target 95%</span>
                        </div>
                        <div className="mt-4">
                            <ComplianceTrend data={charts.daily} />
                        </div>
                    </section>

                    <section aria-labelledby="mingguan-title">
                        <div className="flex items-baseline justify-between gap-2">
                            <h2 id="mingguan-title" className="text-lg font-semibold tracking-[-0.01em]">
                                Temuan per minggu
                            </h2>
                            <span className="flex gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-[2px] bg-chart-1" /> Dibuka
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-[2px] bg-chart-2" /> Ditutup
                                </span>
                            </span>
                        </div>
                        <div
                            className="mt-4 flex h-[240px] items-end gap-4 border-b-(length:--bw) pb-0"
                            role="img"
                            aria-label={charts.weekly
                                .map((w) => `${w.label}: ${w.dibuka} dibuka, ${w.ditutup} ditutup`)
                                .join('; ')}
                        >
                            {charts.weekly.map((w) => (
                                <div key={w.label} className="flex h-full flex-1 flex-col justify-end">
                                    <div className="flex flex-1 items-end justify-center gap-1">
                                        {(['dibuka', 'ditutup'] as const).map((k) => (
                                            <div key={k} className="flex h-full w-6 flex-col justify-end">
                                                <span className="mb-1 text-center text-xs font-semibold tnum">
                                                    {w[k]}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'w-full rounded-t-[3px]',
                                                        k === 'dibuka' ? 'bg-chart-1' : 'bg-chart-2',
                                                    )}
                                                    style={{ height: `${(w[k] / weeklyMax) * 85}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-4">
                            {charts.weekly.map((w) => (
                                <span key={w.label} className="flex-1 text-center text-xs text-muted-foreground">
                                    {w.label}
                                </span>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="space-y-6">
                        {charts.sites.length > 0 && (
                            <section aria-labelledby="site-title">
                                <h2 id="site-title" className="text-lg font-semibold tracking-[-0.01em]">
                                    Per site
                                </h2>
                                <div className="mt-3 overflow-x-auto rounded-[14px] border-(length:--bw)">
                                    <table className="w-full min-w-[480px] text-sm">
                                        <thead className="bg-muted-2 text-left text-xs text-muted-foreground">
                                            <tr className="h-11">
                                                <th className="px-4 font-semibold">Site</th>
                                                <th className="px-4 font-semibold">Kepatuhan</th>
                                                <th className="px-4 text-right font-semibold">P2H</th>
                                                <th className="px-4 text-right font-semibold">Tidak Layak</th>
                                                <th className="px-4 text-right font-semibold">PA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {charts.sites.map((site) => (
                                                <tr key={site.name} className="h-[52px] border-t-(length:--bw)">
                                                    <td className="px-4 font-semibold">{site.name}</td>
                                                    <td className="px-4">
                                                        <span className="flex items-center gap-2">
                                                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                                                                <span
                                                                    className="block h-full rounded-full bg-chart-1"
                                                                    style={{ width: `${site.kepatuhan ?? 0}%` }}
                                                                />
                                                            </span>
                                                            <span className="tnum">{formatPercent(site.kepatuhan)}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 text-right tnum">{formatNumber(site.p2h, 0)}</td>
                                                    <td className={cn('px-4 text-right tnum', site.tidak_layak > 0 && 'text-danger')}>
                                                        {site.tidak_layak}
                                                    </td>
                                                    <td className="px-4 text-right tnum">{formatPercent(site.pa)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        <section aria-labelledby="item-title" className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <h2 id="item-title" className="text-[15px] font-semibold">
                                    Item paling sering bermasalah
                                </h2>
                                {report.item_teratas.length === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">Tidak ada.</p>
                                ) : (
                                    <ul className="mt-2">
                                        {report.item_teratas.map((i) => (
                                            <li key={i.item} className="flex justify-between gap-3 border-b-(length:--bw) py-2 text-sm">
                                                <span className="truncate">{i.item}</span>
                                                <span className="font-semibold tnum">{i.jumlah}×</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <h2 className="text-[15px] font-semibold">Unit dengan temuan terbanyak</h2>
                                {report.unit_teratas.length === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">Tidak ada.</p>
                                ) : (
                                    <ul className="mt-2">
                                        {report.unit_teratas.map((u) => (
                                            <li key={u.no_unit} className="flex justify-between gap-3 border-b-(length:--bw) py-2 text-sm">
                                                <span className="font-semibold tnum">{u.no_unit}</span>
                                                <span className="text-muted-foreground tnum">
                                                    {u.jumlah} ({u.belum_selesai} open)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </section>
                    </div>

                    <section
                        aria-labelledby="ai-title"
                        className="h-fit rounded-[14px] border-(length:--bw) bg-card p-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="ai-title" className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.01em]">
                                <span className="grid size-8 place-items-center rounded-[10px] bg-brand text-black">
                                    <Sparkles className="size-4" aria-hidden />
                                </span>
                                Ringkasan periode
                            </h2>
                            <Badge variant="outline">{source === 'ai' ? 'AI' : 'Template'}</Badge>
                        </div>
                        <Textarea
                            aria-label="Teks laporan periode"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="mt-4 min-h-[300px] text-[13px] leading-relaxed"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" onClick={handleCopy}>
                                <ClipboardCopy />
                                Salin
                            </Button>
                            <Button variant="outline" onClick={() => share(text)}>
                                <Send />
                                Kirim ke WhatsApp
                            </Button>
                            <Button disabled={!aiEnabled || http.processing} onClick={handleAi}>
                                <Sparkles className={cn(http.processing && 'animate-pulse')} />
                                {http.processing ? 'Menganalisis…' : 'Analisis dengan AI'}
                            </Button>
                            {source === 'ai' && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setText(template);
                                        setSource('template');
                                    }}
                                >
                                    <RotateCcw />
                                    Kembali ke template
                                </Button>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {aiEnabled
                                ? 'Dibuat dari data PIMS · periksa sebelum dibagikan.'
                                : 'AI nonaktif — isi GEMINI_API_KEY untuk mengaktifkan analisis & rekomendasi AI.'}
                        </p>
                    </section>
                </div>
            </div>
        </>
    );
}

PeriodReport.layout = {
    breadcrumbs: [{ title: 'Laporan periode', href: '/p2h/period-report' }],
};
