import { Head, router, useHttp } from '@inertiajs/react';
import {
    AlarmClock,
    ClipboardCopy,
    FileDown,
    Gauge,
    RotateCcw,
    Send,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    generateAi,
    pdf,
} from '@/actions/App/Http/Controllers/P2hPeriodReportController';
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
import { Textarea } from '@/components/ui/textarea';
import { useClipboard } from '@/hooks/use-clipboard';
import { useWhatsAppShare } from '@/hooks/use-whatsapp-share';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Period =
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

interface Props {
    report: Report;
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

const PERIOD_LABEL: Record<Period, string> = {
    this_week: 'Minggu ini',
    last_week: 'Minggu lalu',
    this_month: 'Bulan ini',
    last_month: 'Bulan lalu',
    custom: 'Pilih tanggal',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PeriodReport({
    report,
    template,
    filters,
    jenisOptions,
    sites,
    aiEnabled,
}: Props) {
    const [text, setText] = useState(template);
    const [source, setSource] = useState<'template' | 'ai'>('template');
    const [custom, setCustom] = useState({
        start: filters.start,
        end: filters.end,
    });
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

    const { kepatuhan: k, temuan: t } = report;

    return (
        <>
            <Head title="Periodic Report P2H" />
            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* ── Header ── */}
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            Periodic Report P2H
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Evaluasi mingguan / bulanan: kepatuhan, tren temuan,
                            BBM, dan servis · {report.periode.label}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label>Periode</Label>
                            <Select
                                value={filters.period}
                                onValueChange={(v) =>
                                    v === 'custom'
                                        ? applyFilter({
                                              period: 'custom',
                                              ...custom,
                                          })
                                        : applyFilter({ period: v as Period })
                                }
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        Object.keys(PERIOD_LABEL) as Period[]
                                    ).map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {PERIOD_LABEL[p]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {filters.period === 'custom' && (
                            <div className="flex items-end gap-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="start">Dari</Label>
                                    <Input
                                        id="start"
                                        type="date"
                                        className="h-9 w-38"
                                        value={custom.start}
                                        onChange={(e) =>
                                            setCustom((c) => ({
                                                ...c,
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
                                        value={custom.end}
                                        onChange={(e) =>
                                            setCustom((c) => ({
                                                ...c,
                                                end: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    className="h-9"
                                    onClick={() =>
                                        applyFilter({
                                            period: 'custom',
                                            ...custom,
                                        })
                                    }
                                >
                                    Terapkan
                                </Button>
                            </div>
                        )}
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

                {/* ── KPI ── */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Kpi
                        icon={ShieldCheck}
                        label="Kepatuhan P2H"
                        value={`${(k.persen ?? 0).toLocaleString('id-ID')}%`}
                        hint={`${k.p2h_masuk}/${k.p2h_seharusnya} P2H`}
                        tone={
                            (k.persen ?? 0) >= 90
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                        }
                    />
                    <Kpi
                        icon={Wrench}
                        label="Total temuan"
                        value={t.total}
                        hint={`${t.closed} closed · AA ${t.kode_aa}`}
                        tone="text-slate-600"
                    />
                    <Kpi
                        icon={Gauge}
                        label="Rata-rata penyelesaian"
                        value={
                            t.rata_rata_hari_penyelesaian !== null
                                ? `${t.rata_rata_hari_penyelesaian.toLocaleString('id-ID')} hari`
                                : '—'
                        }
                        tone="text-blue-600"
                    />
                    <Kpi
                        icon={AlarmClock}
                        label="Lewat target"
                        value={report.overdue.length}
                        hint={`${t.tanpa_pic} tanpa PIC`}
                        tone="text-red-600"
                    />
                </div>

                <div className="grid gap-5 lg:grid-cols-5">
                    {/* ── WhatsApp text ── */}
                    <Card className="lg:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                Teks WhatsApp
                                <Badge variant="outline">
                                    {source === 'ai' ? 'AI' : 'Template'}
                                </Badge>
                            </CardTitle>
                            {source === 'ai' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => {
                                        setText(template);
                                        setSource('template');
                                    }}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Kembali ke template
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="min-h-[420px] font-mono text-xs leading-relaxed"
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button className="gap-2" onClick={handleCopy}>
                                    <ClipboardCopy className="h-4 w-4" />
                                    Salin
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => share(text)}
                                >
                                    <Send className="h-4 w-4" />
                                    Kirim ke WhatsApp
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    asChild
                                >
                                    <a href={pdf.url({ query })}>
                                        <FileDown className="h-4 w-4" />
                                        Unduh PDF
                                    </a>
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                    disabled={!aiEnabled || http.processing}
                                    onClick={handleAi}
                                >
                                    <Sparkles
                                        className={cn(
                                            'h-4 w-4',
                                            http.processing && 'animate-pulse',
                                        )}
                                    />
                                    {http.processing
                                        ? 'Menganalisis...'
                                        : 'Analisis dengan AI'}
                                </Button>
                            </div>
                            {!aiEnabled && (
                                <p className="text-xs text-muted-foreground">
                                    AI nonaktif — isi GEMINI_API_KEY untuk
                                    mengaktifkan analisis & rekomendasi AI.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Highlights ── */}
                    <div className="flex flex-col gap-5 lg:col-span-2">
                        <RankCard
                            title="Item paling sering bermasalah"
                            rows={report.item_teratas.map((r) => ({
                                label: r.item,
                                value: `${r.jumlah}x`,
                            }))}
                        />
                        <RankCard
                            title="Unit dengan temuan terbanyak"
                            rows={report.unit_teratas.map((r) => ({
                                label: r.no_unit,
                                sub: r.jenis_unit,
                                value: `${r.jumlah} (${r.belum_selesai} open)`,
                            }))}
                        />
                        <RankCard
                            title="Perlu perhatian"
                            rows={[
                                ...report.berulang.map((r) => ({
                                    label: `🔁 ${r.no_unit} · ${r.item}`,
                                    value: `${r.jumlah}x`,
                                })),
                                ...report.overdue.map((r) => ({
                                    label: `⏰ ${r.no_unit} · ${r.item}`,
                                    sub: `PIC: ${r.pic ?? 'Belum ditunjuk'}`,
                                    value: `+${r.hari_terlambat} hari`,
                                })),
                            ]}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

function Kpi({
    icon: Icon,
    label,
    value,
    hint,
    tone,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    hint?: string;
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
                        {hint ? ` · ${hint}` : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function RankCard({
    title,
    rows,
}: {
    title: string;
    rows: { label: string; sub?: string; value: string }[];
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Tidak ada data.
                    </p>
                ) : (
                    <ul className="divide-y text-sm">
                        {rows.map((r, i) => (
                            <li
                                key={i}
                                className="flex items-center justify-between gap-3 py-1.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate">{r.label}</p>
                                    {r.sub && (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {r.sub}
                                        </p>
                                    )}
                                </div>
                                <span className="shrink-0 font-medium tabular-nums">
                                    {r.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

PeriodReport.layout = {
    breadcrumbs: [{ title: 'Periodic Report P2H', href: '/p2h/period-report' }],
};
