import { Head, Link, router, useHttp, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardCopy,
    ClockAlert,
    MessageSquareText,
    RotateCcw,
    Send,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateAi } from '@/actions/App/Http/Controllers/P2hDailySummaryController';
import InputError from '@/components/input-error';
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

interface Finding {
    id: number;
    item: string | null;
    kode_bahaya: string | null;
    keterangan: string | null;
    tindakan: string | null;
    pic: string | null;
    target: string | null;
    status: 'open' | 'progress' | 'closed';
    overdue?: boolean;
    berulang?: number | null;
}

interface UnitSummary {
    tanggal: string;
    no_unit: string;
    jenis_unit: string;
    no_lambung: string | null;
    kondisi: 'layak' | 'temuan' | 'tidak_layak';
    kondisi_akhir: string | null;
    entries: { driver: string | null; shift: string | null }[];
    findings: Finding[];
}

interface Digest {
    tanggal_label: string;
    multi_hari: boolean;
    site: string | null;
    stats: {
        sudah_p2h: number;
        unit_temuan: number;
        unit_tidak_layak: number;
        temuan: number;
        temuan_belum_selesai: number;
        temuan_overdue: number;
    };
    units: UnitSummary[];
}

interface Filters {
    start: string;
    end: string;
    site_id: number | null;
    jenis_unit: string | null;
}

interface Props {
    digest: Digest;
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

const STATUS_BADGE: Record<Finding['status'], string> = {
    open: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    progress:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    closed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailySummary({
    digest,
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
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const today = new Date().toLocaleDateString('en-CA');

    // preserveState: false → halaman di-mount ulang, teks kembali ke template terbaru
    const applyFilter = (next: Partial<Filters>) => {
        router.get(
            '/p2h/daily-summary',
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
                toast.warning('Ringkasan AI tidak tersedia', {
                    description: res.message,
                });
            } else {
                toast.success('Ringkasan dirapikan oleh AI', {
                    description: 'Periksa kembali sebelum dikirim.',
                });
            }
        } catch {
            toast.error('Gagal menghubungi server', {
                description: 'Coba lagi beberapa saat.',
            });
        }
    };

    const handleCopy = async () => {
        if (await copy(text)) {
            toast.success('Ringkasan disalin', {
                description: 'Tempelkan di grup WhatsApp.',
            });
        } else {
            toast.error('Gagal menyalin ke clipboard');
        }
    };

    const { stats } = digest;

    return (
        <>
            <Head title="Daily Report P2H" />
            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* ── Header ── */}
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                            <MessageSquareText className="h-6 w-6 text-primary" />
                            Daily Report P2H
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Laporan monitoring P2H siap kirim ke WhatsApp:
                            temuan, PIC, dan progress perbaikan.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="start">Dari tanggal</Label>
                            <Input
                                id="start"
                                type="date"
                                className="h-9 w-40"
                                value={filters.start}
                                max={today}
                                onChange={(e) =>
                                    e.target.value &&
                                    applyFilter({
                                        start: e.target.value,
                                        // Tanggal akhir tidak boleh sebelum tanggal awal
                                        end:
                                            e.target.value > filters.end
                                                ? e.target.value
                                                : filters.end,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="end">Sampai tanggal</Label>
                            <Input
                                id="end"
                                type="date"
                                className="h-9 w-40"
                                value={filters.end}
                                min={filters.start}
                                max={today}
                                onChange={(e) =>
                                    e.target.value &&
                                    applyFilter({ end: e.target.value })
                                }
                            />
                            <InputError message={errors.end} />
                        </div>
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
                                <SelectTrigger className="h-9 w-44">
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
                                <SelectTrigger className="h-9 w-44">
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

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard
                        icon={CheckCircle2}
                        label="Sudah P2H"
                        value={stats.sudah_p2h}
                        tone="text-emerald-600"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Temuan"
                        value={stats.temuan}
                        hint={`${stats.unit_temuan + stats.unit_tidak_layak} unit`}
                        tone="text-amber-600"
                    />
                    <StatCard
                        icon={XCircle}
                        label="Unit BD"
                        value={stats.unit_tidak_layak}
                        tone="text-red-600"
                    />
                    <StatCard
                        icon={ClockAlert}
                        label="Temuan belum selesai"
                        value={stats.temuan_belum_selesai}
                        hint={
                            stats.temuan_overdue
                                ? `${stats.temuan_overdue} lewat target`
                                : undefined
                        }
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
                                    variant="secondary"
                                    className="gap-2"
                                    disabled={!aiEnabled || http.processing}
                                    onClick={handleAi}
                                    title={
                                        aiEnabled
                                            ? undefined
                                            : 'Isi GEMINI_API_KEY di .env untuk mengaktifkan AI'
                                    }
                                >
                                    <Sparkles
                                        className={cn(
                                            'h-4 w-4',
                                            http.processing && 'animate-pulse',
                                        )}
                                    />
                                    {http.processing
                                        ? 'Merapikan...'
                                        : 'Rapikan dengan AI'}
                                </Button>
                            </div>
                            {!aiEnabled && (
                                <p className="text-xs text-muted-foreground">
                                    AI nonaktif — isi GEMINI_API_KEY (Google AI
                                    Studio) untuk mengaktifkan ringkasan AI.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Findings overview ── */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base">
                                Temuan & PIC
                            </CardTitle>
                            <Button variant="link" size="sm" asChild>
                                <Link href="/p2h/findings">
                                    Kelola temuan →
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {digest.units.every(
                                (u) => u.findings.length === 0,
                            ) ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Tidak ada temuan pada periode ini.
                                </p>
                            ) : (
                                digest.units.flatMap((u) =>
                                    u.findings.map((f) => (
                                        <FindingRow
                                            key={f.id}
                                            unit={u.no_unit}
                                            tanggal={
                                                digest.multi_hari
                                                    ? u.tanggal
                                                    : undefined
                                            }
                                            finding={f}
                                        />
                                    )),
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    hint,
    tone,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    hint?: string;
    tone: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <Icon className={cn('h-8 w-8 shrink-0', tone)} />
                <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums">{value}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {label}
                        {hint ? ` · ${hint}` : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function FindingRow({
    unit,
    finding,
    tanggal,
}: {
    unit: string;
    finding: Finding;
    tanggal?: string;
}) {
    return (
        <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                    {tanggal && (
                        <span className="mr-1 text-xs font-normal text-muted-foreground">
                            {new Date(tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                            })}{' '}
                            ·
                        </span>
                    )}
                    {unit} · {finding.item}
                    {finding.kode_bahaya === 'AA' && (
                        <Badge className="ml-2 bg-red-600 text-white hover:bg-red-600">
                            AA
                        </Badge>
                    )}
                </p>
                <Badge
                    variant="outline"
                    className={cn('capitalize', STATUS_BADGE[finding.status])}
                >
                    {finding.status}
                </Badge>
            </div>
            {finding.keterangan && (
                <p className="mt-1 text-muted-foreground">
                    {finding.keterangan}
                </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
                Tindakan: {finding.tindakan || 'Belum ditentukan'} · PIC:{' '}
                {finding.pic || 'Belum ditunjuk'}
                {finding.overdue && ` · ⏰ lewat target`}
                {finding.berulang && ` · 🔁 berulang ${finding.berulang}x`}
            </p>
        </div>
    );
}

DailySummary.layout = {
    breadcrumbs: [{ title: 'Daily Report P2H', href: '/p2h/daily-summary' }],
};
