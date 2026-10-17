import { Head, Link, router, useHttp, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ClipboardCopy,
    Loader2,
    RotateCcw,
    Send,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateAi } from '@/actions/App/Http/Controllers/P2hDailySummaryController';
import InputError from '@/components/input-error';
import { KpiCard } from '@/components/pims/kpi';
import { PageHeader } from '@/components/pims/page-header';
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
import { formatDate, formatPercent } from '@/lib/format';
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
        total_unit: number;
        belum_p2h: number;
        tidak_ready: number;
    };
    units: UnitSummary[];
    belum_p2h?: Record<string, string[]>;
    tidak_ready?: Record<string, { no_unit: string; status: string }[]>;
    pa?: Record<string, { pa: number | null; total: number; bd: number }>;
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
            toast.success('Teks disalin', {
                description: 'Tempelkan di grup WhatsApp.',
            });
        } else {
            toast.error('Gagal menyalin ke clipboard');
        }
    };

    // Navigasi hari ‹ › (RingkasanHarian-Desktop.png) — tidak bisa ke masa depan
    const day = filters.end;
    const shiftDay = (delta: number) => {
        const d = new Date(`${day}T00:00:00`);
        d.setDate(d.getDate() + delta);
        const iso = d.toLocaleDateString('en-CA');

        applyFilter({ start: iso, end: iso });
    };

    const s = digest.stats;
    const wajib = Math.max(0, s.total_unit - s.tidak_ready);
    const pct = wajib > 0 ? (s.sudah_p2h / wajib) * 100 : null;
    const paRows = Object.values(digest.pa ?? {});
    const paTotal = paRows.reduce((n, r) => n + r.total, 0);
    const pa =
        paTotal > 0
            ? paRows.reduce((n, r) => n + (r.pa ?? 0) * r.total, 0) / paTotal
            : null;
    const belum = digest.belum_p2h?.[day] ?? [];
    const tidakReady = digest.tidak_ready?.[day] ?? [];
    const bdUnits = digest.units.filter((u) => u.kondisi === 'tidak_layak');

    const actions: {
        tone: 'danger' | 'warning';
        label: React.ReactNode;
        href: string;
        cta: string;
    }[] = [
        ...bdUnits.map((u) => ({
            tone: 'danger' as const,
            label: (
                <>
                    <b className="font-semibold">{u.no_unit}</b> Tidak Layak ·{' '}
                    {u.findings.map((f) => f.item).filter(Boolean).join(', ') ||
                        'item kritis'}
                </>
            ),
            href: '/downtime',
            cta: 'Downtime',
        })),
        ...tidakReady
            .filter((t) => !bdUnits.some((u) => u.no_unit === t.no_unit))
            .map((t) => ({
                tone: 'warning' as const,
                label: (
                    <>
                        <b className="font-semibold">{t.no_unit}</b> tidak
                        Ready · {t.status}
                    </>
                ),
                href: '/downtime',
                cta: 'Downtime',
            })),
        ...(belum.length > 0
            ? [
                  {
                      tone: 'warning' as const,
                      label: (
                          <>
                              <b className="font-semibold">
                                  {belum.length} unit
                              </b>{' '}
                              belum P2H · {belum.join(', ')}
                          </>
                      ),
                      href: '/monitoring-p2h',
                      cta: 'Monitoring',
                  },
              ]
            : []),
        ...(s.temuan_overdue > 0
            ? [
                  {
                      tone: 'warning' as const,
                      label: (
                          <>
                              <b className="font-semibold">
                                  {s.temuan_overdue} temuan
                              </b>{' '}
                              lewat tenggat dari {s.temuan_belum_selesai} open
                          </>
                      ),
                      href: '/p2h/findings?status=overdue',
                      cta: 'Temuan',
                  },
              ]
            : []),
    ];

    const kpis = [
        {
            label: 'P2H masuk',
            value: `${s.sudah_p2h} / ${wajib}`,
            sub: pct === null ? 'tidak ada unit wajib' : `${formatPercent(pct)} unit wajib`,
            tone: 'default' as const,
        },
        {
            label: 'Layak / tidak layak',
            value: `${s.sudah_p2h - s.unit_tidak_layak} / ${s.unit_tidak_layak}`,
            sub: 'tidak layak otomatis BD',
            tone: s.unit_tidak_layak > 0 ? ('danger' as const) : ('default' as const),
        },
        {
            label: 'Belum P2H',
            value: String(s.belum_p2h),
            sub: `${s.tidak_ready} unit tidak Ready`,
            tone: s.belum_p2h > 0 ? ('warning' as const) : ('default' as const),
        },
        {
            label: 'PA armada',
            value: formatPercent(pa),
            sub: 'target 90%',
            tone: pa !== null && pa < 90 ? ('danger' as const) : ('default' as const),
        },
        {
            label: 'Temuan baru / open',
            value: `${s.temuan} / ${s.temuan_belum_selesai}`,
            sub: 'dari P2H hari ini',
            tone: 'default' as const,
        },
        {
            label: 'Lewat tenggat',
            value: String(s.temuan_overdue),
            sub: 'temuan open',
            tone: s.temuan_overdue > 0 ? ('danger' as const) : ('default' as const),
        },
    ];

    return (
        <>
            <Head title="Ringkasan harian" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Ringkasan harian"
                    description={[
                        digest.site ?? 'Semua site',
                        filters.jenis_unit ?? 'semua jenis unit',
                    ].join(' · ')}
                    actions={
                        <>
                            <Select
                                value={filters.jenis_unit ?? 'all'}
                                onValueChange={(v) =>
                                    applyFilter({ jenis_unit: v === 'all' ? null : v })
                                }
                            >
                                <SelectTrigger aria-label="Jenis unit" className="h-10 w-40">
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
                                    onValueChange={(v) =>
                                        applyFilter({ site_id: v === 'all' ? null : Number(v) })
                                    }
                                >
                                    <SelectTrigger aria-label="Site" className="h-10 w-40">
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
                            <div className="flex h-10 items-center rounded-[10px] border-(length:--bw)">
                                <button
                                    type="button"
                                    onClick={() => shiftDay(-1)}
                                    aria-label="Hari sebelumnya"
                                    className="grid size-10 place-items-center rounded-l-[10px] hover:bg-muted"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <label className="relative px-2 text-sm font-semibold whitespace-nowrap">
                                    {digest.multi_hari
                                        ? digest.tanggal_label
                                        : formatDate(new Date(`${day}T00:00:00`), { withDay: true })}
                                    <input
                                        type="date"
                                        value={day}
                                        max={today}
                                        aria-label="Pilih tanggal"
                                        onChange={(e) =>
                                            e.target.value &&
                                            applyFilter({ start: e.target.value, end: e.target.value })
                                        }
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => shiftDay(1)}
                                    disabled={day >= today}
                                    aria-label="Hari berikutnya"
                                    className="grid size-10 place-items-center rounded-r-[10px] hover:bg-muted disabled:opacity-40"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </>
                    }
                />
                <InputError message={errors.end} />

                <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
                    <div className="min-w-0 space-y-5">
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                            {kpis.map((k) => (
                                <KpiCard
                                    key={k.label}
                                    label={k.label}
                                    value={k.value}
                                    sub={k.sub}
                                    tone={k.tone}
                                />
                            ))}
                        </div>

                        <section className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5">
                            <h2 className="text-[15px] font-semibold">Perlu tindakan</h2>
                            {actions.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Tidak ada yang perlu ditindaklanjuti.
                                </p>
                            ) : (
                                <ul className="mt-2">
                                    {actions.map((a, i) => (
                                        <li key={i}>
                                            <Link
                                                href={a.href}
                                                className="flex items-center gap-3 rounded-[10px] py-2.5 text-sm hover:bg-muted/60"
                                            >
                                                <span
                                                    className={cn(
                                                        'size-2 shrink-0 rounded-full',
                                                        a.tone === 'danger' ? 'bg-danger' : 'bg-warning',
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="min-w-0 flex-1">{a.label}</span>
                                                <span className="shrink-0 text-[13px] text-muted-foreground">
                                                    {a.cta} ›
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="rounded-[14px] border-(length:--bw) bg-card p-4 lg:p-5">
                            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                                <Sparkles className="size-4" aria-hidden />
                                Ringkasan AI
                            </h2>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {source === 'ai'
                                    ? 'Teks WhatsApp sudah dirapikan AI. Periksa sebelum dibagikan.'
                                    : 'Rapikan bahasa teks WhatsApp dengan AI; susunan baris tetap dari template.'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    disabled={!aiEnabled || http.processing}
                                    onClick={handleAi}
                                >
                                    {http.processing && <Loader2 className="animate-spin" />}
                                    {http.processing
                                        ? 'Merapikan…'
                                        : source === 'ai'
                                          ? 'Buat ulang'
                                          : 'Buat ringkasan'}
                                </Button>
                                {source === 'ai' && (
                                    <Button
                                        variant="outline"
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
                            {!aiEnabled && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    AI nonaktif — isi GEMINI_API_KEY (Google AI Studio) untuk mengaktifkan.
                                </p>
                            )}
                        </section>
                    </div>

                    {/* Teks WhatsApp — panel kanan sticky */}
                    <aside className="h-fit overflow-hidden rounded-[14px] border-(length:--bw) bg-card lg:sticky lg:top-6">
                        <div className="flex items-baseline justify-between gap-2 px-4 pt-4">
                            <h2 className="text-[15px] font-semibold">Teks untuk WhatsApp</h2>
                            <span className="text-xs text-muted-foreground tnum">
                                {text.length} karakter
                            </span>
                        </div>
                        <div className="mt-3 border-y-(length:--bw) bg-muted-2 p-4">
                            <Textarea
                                aria-label="Teks WhatsApp"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="min-h-[360px] resize-y rounded-[12px] border-(length:--bw) bg-card text-base leading-relaxed whitespace-pre-wrap lg:text-[13px]"
                            />
                        </div>
                        <div className="space-y-2 p-4">
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={handleCopy}>
                                    <ClipboardCopy />
                                    Salin teks
                                </Button>
                                <Button onClick={() => share(text)}>
                                    <Send />
                                    Buka WhatsApp
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Membuka wa.me dengan teks terisi. Anda yang memilih grup dan menekan kirim.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

// ── Components ────────────────────────────────────────────────────────────────

DailySummary.layout = {
    breadcrumbs: [{ title: 'Ringkasan harian', href: '/p2h/daily-summary' }],
};
