import { Head, router } from '@inertiajs/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DayStatus = 'layak' | 'temuan' | 'bd' | 'downtime' | 'kosong' | null;

interface Props {
    token: string;
    bulan: string;
    bulanLabel: string;
    jenis: 'LV' | 'Bus' | null;
    site: number | null;
    siteName: string | null;
    sites: { id: number; name: string }[];
    dates: { date: string; day: number; sunday: boolean }[];
    rows: {
        no_unit: string;
        jenis_unit: string;
        days: DayStatus[];
        hari_p2h: number;
    }[];
    perDay: (number | null)[];
    totalUnit: number;
    hariBerjalan: number;
    pa: Record<string, { pa: number | null; total: number; bd: number }>;
    months: { value: string; label: string }[];
    updatedAt: string;
}

const STATUS: Record<
    Exclude<DayStatus, null>,
    { code: string; label: string; cls: string }
> = {
    layak: {
        code: 'L',
        label: 'P2H, layak',
        cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    temuan: {
        code: 'T',
        label: 'P2H, ada temuan',
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    bd: {
        code: 'BD',
        label: 'P2H, breakdown',
        cls: 'bg-red-600 text-white dark:bg-red-700',
    },
    downtime: {
        code: 'D',
        label: 'Tidak P2H, unit BD/PM/servis',
        cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    },
    kosong: {
        code: '–',
        label: 'Tidak P2H',
        cls: 'bg-background text-red-500 ring-1 ring-red-200 ring-inset dark:ring-red-900',
    },
};

const JENIS_OPTIONS = [
    { value: null, label: 'Semua unit' },
    { value: 'LV', label: 'Light Vehicle' },
    { value: 'Bus', label: 'Bus' },
] as const;

function pct(value: number | null): string {
    return value === null ? '–' : `${value.toLocaleString('id-ID')}%`;
}

export default function PublicP2hReport({
    token,
    bulan,
    bulanLabel,
    jenis,
    site,
    siteName,
    sites,
    dates,
    rows,
    perDay,
    totalUnit,
    hariBerjalan,
    pa,
    months,
    updatedAt,
}: Props) {
    const go = (next: {
        bulan?: string;
        jenis?: string | null;
        site?: number | null;
    }) =>
        router.get(
            `/laporan/${token}`,
            Object.fromEntries(
                Object.entries({ bulan, jenis, site, ...next }).filter(
                    ([, v]) => v !== null && v !== undefined,
                ),
            ),
            { preserveScroll: true },
        );

    const lengkap = rows.filter((r) => r.hari_p2h >= hariBerjalan).length;

    return (
        <>
            <Head title={`Rekap P2H ${bulanLabel}`}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="min-h-screen bg-background text-foreground">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-6 md:px-6">
                    {/* Header */}
                    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                PIMS · P2H Management System
                            </p>
                            <h1 className="text-xl font-bold md:text-2xl">
                                Rekap P2H {bulanLabel}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {JENIS_OPTIONS.find((o) => o.value === jenis)
                                    ?.label ?? 'Semua unit'}
                                {siteName && ` · Site ${siteName}`} ·{' '}
                                {totalUnit} unit aktif · diperbarui {updatedAt}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-lg bg-muted p-1">
                                {JENIS_OPTIONS.map((o) => (
                                    <button
                                        key={o.label}
                                        type="button"
                                        onClick={() => go({ jenis: o.value })}
                                        aria-pressed={jenis === o.value}
                                        className={cn(
                                            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                            jenis === o.value
                                                ? 'bg-background shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {o.value ?? 'Semua'}
                                    </button>
                                ))}
                            </div>
                            {sites.length > 1 && (
                                <Select
                                    value={site ? String(site) : 'all'}
                                    onValueChange={(v) =>
                                        go({
                                            site:
                                                v === 'all' ? null : Number(v),
                                        })
                                    }
                                >
                                    <SelectTrigger
                                        className="h-9 w-44"
                                        aria-label="Pilih site"
                                    >
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
                            )}
                            <Select
                                value={bulan}
                                onValueChange={(v) => go({ bulan: v })}
                            >
                                <SelectTrigger
                                    className="h-9 w-44"
                                    aria-label="Pilih bulan"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem
                                            key={m.value}
                                            value={m.value}
                                        >
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </header>

                    {/* Ringkasan */}
                    <section className="flex flex-wrap gap-x-8 gap-y-2 border-y py-3 text-sm">
                        {Object.entries(pa).map(([j, g]) => (
                            <div key={j}>
                                <span className="text-muted-foreground">
                                    PA {j}
                                </span>{' '}
                                <strong className="tabular-nums">
                                    {pct(g.pa)}
                                </strong>
                            </div>
                        ))}
                        <div>
                            <span className="text-muted-foreground">
                                P2H lengkap setiap hari
                            </span>{' '}
                            <strong className="tabular-nums">
                                {lengkap} dari {totalUnit} unit
                            </strong>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Hari berjalan
                            </span>{' '}
                            <strong className="tabular-nums">
                                {hariBerjalan} dari {dates.length}
                            </strong>
                        </div>
                    </section>

                    {/* Keterangan */}
                    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        {Object.values(STATUS).map((s) => (
                            <li
                                key={s.code}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold',
                                        s.cls,
                                    )}
                                >
                                    {s.code}
                                </span>
                                {s.label}
                            </li>
                        ))}
                    </ul>

                    {/* Kalender */}
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-muted/60">
                                    <th
                                        scope="col"
                                        className="sticky left-0 z-10 min-w-28 border-r bg-muted px-3 py-2 text-left font-semibold"
                                    >
                                        Unit
                                    </th>
                                    {dates.map((d) => (
                                        <th
                                            key={d.date}
                                            scope="col"
                                            className={cn(
                                                'min-w-8 px-0.5 py-2 text-center font-medium tabular-nums',
                                                d.sunday && 'text-red-500',
                                            )}
                                        >
                                            {d.day}
                                        </th>
                                    ))}
                                    <th
                                        scope="col"
                                        className="border-l px-3 py-2 text-right font-semibold whitespace-nowrap"
                                    >
                                        Hari P2H
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.no_unit}
                                        className="border-t hover:bg-muted/30"
                                    >
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-10 border-r bg-background px-3 py-1.5 text-left font-semibold whitespace-nowrap"
                                        >
                                            {r.no_unit}
                                        </th>
                                        {r.days.map((s, i) => (
                                            <td
                                                key={dates[i].date}
                                                className="p-0.5 text-center"
                                            >
                                                {s && (
                                                    <span
                                                        title={`${r.no_unit} · ${dates[i].day} ${bulanLabel}: ${STATUS[s].label}`}
                                                        className={cn(
                                                            'flex h-6 items-center justify-center rounded text-[10px] font-semibold',
                                                            STATUS[s].cls,
                                                        )}
                                                    >
                                                        {STATUS[s].code}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                        <td
                                            className={cn(
                                                'border-l px-3 py-1.5 text-right font-semibold whitespace-nowrap tabular-nums',
                                                r.hari_p2h < hariBerjalan &&
                                                    'text-red-600 dark:text-red-400',
                                            )}
                                        >
                                            {r.hari_p2h}/{hariBerjalan}
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={dates.length + 2}
                                            className="px-3 py-8 text-center text-muted-foreground"
                                        >
                                            Tidak ada unit aktif.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/60 font-semibold">
                                    <th
                                        scope="row"
                                        className="sticky left-0 z-10 border-r bg-muted px-3 py-2 text-left whitespace-nowrap"
                                    >
                                        Unit P2H
                                    </th>
                                    {perDay.map((n, i) => (
                                        <td
                                            key={dates[i].date}
                                            className="px-0.5 py-2 text-center tabular-nums"
                                        >
                                            {n ?? ''}
                                        </td>
                                    ))}
                                    <td className="border-l px-3 py-2 text-right whitespace-nowrap">
                                        dari {totalUnit}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <footer className="text-xs text-muted-foreground">
                        PA = (jam kalender − jam BD/PM/servis) ÷ jam kalender,
                        sampai hari ini. Halaman ini hanya-baca dan dibagikan
                        melalui link khusus.
                    </footer>
                </div>
            </main>
        </>
    );
}
