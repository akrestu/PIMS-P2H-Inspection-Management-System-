import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/driver';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    ClipboardPlus,
    Clock,
    History,
    Moon,
    ShieldCheck,
    Sun,
    Truck,
    XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
    id: number;
    session_id: number;
    no_unit: string;
    jenis_unit: string;
    tanggal: string;
    shift: string;
    km_awal: number | null;
    kondisi_akhir: string | null;
    total_items: number;
    layak_count: number;
    tl_count: number;
    score: number;
    submitted_at: string | null;
}

interface Stats {
    total_p2h: number;
    total_p2h_bulan: number;
    total_tidak_layak: number;
}

interface Props {
    shiftAktif: 'Shift I' | 'Shift II';
    sudahP2hShiftIni: boolean;
    stats: Stats;
    history: HistoryItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string; sub: string } {
    const h = new Date().getHours();
    if (h < 5)  return { text: 'Selamat Malam',  emoji: '🌙', sub: 'Istirahat yang cukup ya.' };
    if (h < 12) return { text: 'Selamat Pagi',   emoji: '☀️', sub: 'Semoga perjalanan hari ini aman.' };
    if (h < 15) return { text: 'Selamat Siang',  emoji: '🌤️', sub: 'Tetap waspada di jalan ya.' };
    if (h < 18) return { text: 'Selamat Sore',   emoji: '🌅', sub: 'Hampir selesai, hati-hati.' };
    return       { text: 'Selamat Malam',  emoji: '🌙', sub: 'Hati-hati di jalan malam ini.' };
}

function formatDateId() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());
}

function getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0];
}

// ─── Greeting Header ──────────────────────────────────────────────────────────

function GreetingHeader({
    name,
    shiftAktif,
    sudahP2hShiftIni,
}: {
    name: string;
    shiftAktif: 'Shift I' | 'Shift II';
    sudahP2hShiftIni: boolean;
}) {
    const greeting  = getGreeting();
    const firstName = getFirstName(name);
    const isDay     = shiftAktif === 'Shift I';

    return (
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
                            <span className="text-primary">, {firstName}</span>!
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm">{greeting.sub}</p>
                </div>

                {/* Shift badge + P2H dot */}
                <div className="flex items-center gap-2 shrink-0">
                    <Badge
                        variant="outline"
                        className={cn(
                            'gap-1 px-2.5 py-1 text-xs font-medium',
                            isDay
                                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
                        )}
                    >
                        {isDay ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        {shiftAktif}
                    </Badge>
                    <span className={cn(
                        'h-2 w-2 rounded-full',
                        sudahP2hShiftIni ? 'bg-emerald-500' : 'bg-amber-500',
                    )} />
                </div>
            </div>
        </div>
    );
}

// ─── P2H Status Banner ────────────────────────────────────────────────────────

function P2hStatusBanner({
    shiftAktif,
    sudahP2hShiftIni,
}: {
    shiftAktif: 'Shift I' | 'Shift II';
    sudahP2hShiftIni: boolean;
}) {
    const isDay = shiftAktif === 'Shift I';

    if (!sudahP2hShiftIni) {
        // ── BELUM P2H — urgent state ──
        return (
            <div className="px-4">
                <div className={cn(
                    'relative overflow-hidden rounded-2xl border-2 border-amber-400 dark:border-amber-600',
                    'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
                )}>
                    {/* Decorative background pattern */}
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/30 dark:bg-amber-600/10" />
                    <div className="absolute -right-1 top-8 h-12 w-12 rounded-full bg-orange-200/30 dark:bg-orange-600/10" />

                    <div className="relative p-4 space-y-4">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60">
                                    {isDay
                                        ? <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        : <Moon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    }
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                        {shiftAktif} · {isDay ? '06:00 – 18:00' : '18:00 – 06:00'}
                                    </p>
                                    <p className="text-base font-bold text-amber-900 dark:text-amber-200 leading-tight">
                                        P2H Belum Diisi!
                                    </p>
                                </div>
                            </div>
                            <Badge className="shrink-0 gap-1 bg-amber-500 text-white hover:bg-amber-500 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Wajib
                            </Badge>
                        </div>

                        {/* Message */}
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                            Kendaraan <strong>tidak boleh dioperasikan</strong> sebelum Form P2H shift ini terisi.
                        </p>

                        {/* CTA Button */}
                        <Link href="/p2h/form">
                            <Button className="w-full h-12 gap-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white shadow-md shadow-amber-500/20">
                                <ClipboardPlus className="h-4 w-4" />
                                Isi Form P2H Sekarang
                                <ArrowRight className="h-4 w-4 ml-auto" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── SUDAH P2H — selesai state ──
    return (
        <div className="px-4">
            <div className={cn(
                'relative overflow-hidden rounded-2xl border-2 border-emerald-400 dark:border-emerald-700',
                'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
            )}>
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-200/30 dark:bg-emerald-600/10" />

                <div className="relative flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            {shiftAktif} · {isDay ? '06:00 – 18:00' : '18:00 – 06:00'}
                        </p>
                        <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
                            P2H Sudah Selesai!
                        </p>
                        <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                            Terima kasih, tetap aman di jalan.
                        </p>
                    </div>
                    <Link href="/p2h/form" className="shrink-0">
                        <Button size="sm" variant="outline"
                            className="h-8 gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/60">
                            <ClipboardPlus className="h-3.5 w-3.5" />
                            P2H Baru
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Stats Section ────────────────────────────────────────────────────────────

function StatsSection({ stats }: { stats: Stats }) {
    const bulanLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
    const hasTL = stats.total_tidak_layak > 0;

    return (
        <div className="px-4 space-y-3">
            {/* 2-column grid for main stats */}
            <div className="grid grid-cols-2 gap-3">
                {/* Total semua waktu */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">Total P2H</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                <ClipboardList className="h-3.5 w-3.5 text-primary" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold leading-none">{stats.total_p2h}</p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">Semua waktu</p>
                    </CardContent>
                </Card>

                {/* Bulan ini */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">Bulan Ini</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                                <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold leading-none">{stats.total_p2h_bulan}</p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground truncate">{bulanLabel}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Item Tidak Layak — full-width, contextual color */}
            <Card className={cn(
                'overflow-hidden border',
                hasTL ? 'border-orange-300 dark:border-orange-700' : 'border-border',
            )}>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            hasTL
                                ? 'bg-orange-100 dark:bg-orange-950/60'
                                : 'bg-muted',
                        )}>
                            <AlertTriangle className={cn(
                                'h-5 w-5',
                                hasTL ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground',
                            )} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Item Tidak Layak</p>
                            <p className="text-xs text-muted-foreground">Total item yang ditandai TL dari semua P2H</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className={cn(
                                'text-2xl font-bold leading-none',
                                hasTL ? 'text-orange-600 dark:text-orange-400' : 'text-foreground',
                            )}>
                                {stats.total_tidak_layak}
                            </p>
                            {hasTL && (
                                <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70 mt-0.5">item</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions() {
    const actions = [
        { label: 'Form P2H', href: '/p2h/form', icon: ClipboardPlus, color: 'bg-primary/10 text-primary' },
        { label: 'Riwayat P2H', href: '/p2h', icon: History, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
        { label: 'Kendaraan', href: '/p2h', icon: Truck, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
    ] as const;

    return (
        <div className="px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Aksi Cepat
            </p>
            <div className="grid grid-cols-3 gap-2.5">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link key={action.label} href={action.href}>
                            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-3.5 text-center transition-colors hover:bg-muted/40 active:bg-muted/60">
                                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', action.color)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-[11px] font-medium leading-tight">{action.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// ─── History Item Card ────────────────────────────────────────────────────────

function HistoryCard({ item }: { item: HistoryItem }) {
    const isLayak = item.score >= 80;
    const isDay   = item.shift === 'Shift I';

    return (
        <Link href={`/p2h/${item.session_id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">

                        {/* Score circle */}
                        <div className={cn(
                            'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl',
                            isLayak
                                ? 'bg-emerald-100 dark:bg-emerald-950/60'
                                : 'bg-red-100 dark:bg-red-950/60',
                        )}>
                            <span className={cn(
                                'text-base font-bold leading-none',
                                isLayak ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
                            )}>
                                {item.score}
                            </span>
                            <span className={cn(
                                'text-[9px] leading-none mt-0.5 font-medium',
                                isLayak ? 'text-emerald-600/70 dark:text-emerald-500' : 'text-red-600/70 dark:text-red-500',
                            )}>
                                %
                            </span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0 space-y-1">
                            {/* Row 1: unit + shift badge */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold truncate">{item.no_unit}</span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'h-4 gap-0.5 px-1.5 text-[10px] font-medium',
                                        isDay
                                            ? 'border-amber-300 text-amber-700 dark:text-amber-400'
                                            : 'border-indigo-300 text-indigo-700 dark:text-indigo-400',
                                    )}
                                >
                                    {isDay ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                                    {item.shift}
                                </Badge>
                                {item.tl_count > 0 && (
                                    <Badge variant="destructive" className="h-4 gap-0.5 px-1.5 text-[10px]">
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        {item.tl_count} TL
                                    </Badge>
                                )}
                            </div>

                            {/* Row 2: date + jenis unit */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{item.submitted_at ?? item.tanggal}</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="truncate">{item.jenis_unit}</span>
                            </div>
                        </div>

                        {/* Right: kondisi + chevron */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                            {item.kondisi_akhir === 'Layak Pakai' ? (
                                <Badge className="gap-1 text-[10px] h-5 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
                                    <ShieldCheck className="h-3 w-3" />
                                    Layak
                                </Badge>
                            ) : item.kondisi_akhir === 'BD' ? (
                                <Badge variant="destructive" className="gap-1 text-[10px] h-5 px-1.5">
                                    <XCircle className="h-3 w-3" />
                                    BD
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">—</Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </div>

                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <Progress
                            value={item.score}
                            className={cn(
                                'h-1.5 rounded-full',
                                '[&>div]:rounded-full',
                                isLayak
                                    ? '[&>div]:bg-emerald-500'
                                    : '[&>div]:bg-red-500',
                            )}
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                            <span>{item.layak_count} Layak</span>
                            <span>{item.total_items} item total</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function EmptyHistory() {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-semibold">Belum ada riwayat P2H</p>
                    <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                        Riwayat P2H akan muncul di sini setelah kamu mengisi form untuk pertama kali.
                    </p>
                </div>
                <Link href="/p2h/form">
                    <Button size="sm" variant="outline" className="gap-1.5">
                        <ClipboardPlus className="h-3.5 w-3.5" />
                        Isi P2H Pertama
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverDashboardIndex({ shiftAktif, sudahP2hShiftIni, stats, history }: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } | null } }>().props;
    const userName = auth?.user?.name ?? 'Pengemudi';

    return (
        <>
            <Head title="Dashboard Driver" />

            <div className="flex flex-1 flex-col gap-0 pb-24">

                {/* ── Greeting Header ── */}
                <GreetingHeader
                    name={userName}
                    shiftAktif={shiftAktif}
                    sudahP2hShiftIni={sudahP2hShiftIni}
                />

                <div className="flex flex-col gap-5">

                    {/* ── P2H Status Banner ── */}
                    <P2hStatusBanner
                        shiftAktif={shiftAktif}
                        sudahP2hShiftIni={sudahP2hShiftIni}
                    />

                    {/* ── Stats ── */}
                    <StatsSection stats={stats} />

                    {/* ── Quick Actions ── */}
                    <QuickActions />

                    <Separator className="mx-4 w-auto" />

                    {/* ── Riwayat P2H ── */}
                    <div className="px-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold">Riwayat P2H</h2>
                                <p className="text-xs text-muted-foreground">
                                    {history.length > 0
                                        ? `${history.length} pemeriksaan terakhir`
                                        : 'Belum ada pemeriksaan'}
                                </p>
                            </div>
                            {history.length > 0 && (
                                <Link href="/p2h">
                                    <Button variant="ghost" size="sm"
                                        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                                        Lihat Semua
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {history.length === 0
                            ? <EmptyHistory />
                            : (
                                <div className="space-y-2">
                                    {history.map((item) => (
                                        <HistoryCard key={item.id} item={item} />
                                    ))}
                                </div>
                            )
                        }
                    </div>

                </div>
            </div>
        </>
    );
}

DriverDashboardIndex.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
