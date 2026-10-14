import { Link } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export type FleetCounts = {
    layak: number;
    temuan: number;
    bd: number;
    tidak_ready: number;
    belum: number;
    total: number;
};

type Segment = Exclude<keyof FleetCounts, 'total'>;

// Warna status (tetap, tidak ikut tema) — selalu disertai label & angka, tidak warna saja
const SEGMENTS: { key: Segment; label: string; color: string; ink: string }[] =
    [
        { key: 'layak', label: 'Layak', color: '#0ca30c', ink: '#ffffff' },
        {
            key: 'temuan',
            label: 'Ada temuan',
            color: '#fab219',
            ink: '#3d2c00',
        },
        { key: 'bd', label: 'BD (P2H)', color: '#d03b3b', ink: '#ffffff' },
        {
            key: 'tidak_ready',
            label: 'Tidak Ready (BD/PM/Servis)',
            color: '#8b8a84',
            ink: '#ffffff',
        },
        { key: 'belum', label: 'Belum P2H', color: '#ec835a', ink: '#3b1607' },
    ];

function FleetBar({ jenis, counts }: { jenis: string; counts: FleetCounts }) {
    const wajib = counts.total - counts.tidak_ready;
    const sudah = counts.layak + counts.temuan + counts.bd;

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                    {jenis}{' '}
                    <span className="text-muted-foreground">
                        · {counts.total} unit
                    </span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                    Sudah P2H{' '}
                    <strong className="text-foreground">
                        {sudah}/{wajib}
                    </strong>
                </span>
            </div>
            <div
                className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md bg-muted"
                role="img"
                aria-label={`${jenis}: ${SEGMENTS.map((s) => `${s.label} ${counts[s.key]}`).join(', ')}`}
            >
                {SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => {
                    const pct =
                        (counts[s.key] / Math.max(counts.total, 1)) * 100;

                    return (
                        <Tooltip key={s.key}>
                            <TooltipTrigger asChild>
                                <div
                                    className="flex h-full min-w-6 items-center justify-center text-xs font-semibold tabular-nums transition-opacity first:rounded-l-md last:rounded-r-md hover:opacity-85"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: s.color,
                                        color: s.ink,
                                    }}
                                >
                                    {/* Angka langsung hanya bila segmen cukup lebar */}
                                    {pct >= 6 ? counts[s.key] : ''}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                                <strong>{s.label}</strong>: {counts[s.key]} unit
                                ({Math.round(pct)}%)
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

export function FleetTodayChart({
    data,
}: {
    data: Record<string, FleetCounts>;
}) {
    const groups = Object.entries(data);
    const total = groups.reduce(
        (acc, [, c]) => {
            SEGMENTS.forEach((s) => (acc[s.key] += c[s.key]));
            acc.total += c.total;

            return acc;
        },
        { layak: 0, temuan: 0, bd: 0, tidak_ready: 0, belum: 0, total: 0 },
    );
    const wajib = total.total - total.tidak_ready;
    const sudah = total.layak + total.temuan + total.bd;
    const pct = wajib > 0 ? Math.round((sudah / wajib) * 100) : 0;

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        Kondisi Armada Hari Ini
                    </CardTitle>
                    <CardDescription>
                        {total.total} unit aktif · {total.tidak_ready} tidak
                        Ready · wajib P2H {wajib} unit
                    </CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums">
                        {sudah}
                        <span className="text-base font-medium text-muted-foreground">
                            /{wajib}
                        </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        sudah P2H ({pct}%)
                    </p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {groups.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Belum ada unit aktif.
                    </p>
                ) : (
                    groups.map(([jenis, counts]) => (
                        <FleetBar key={jenis} jenis={jenis} counts={counts} />
                    ))
                )}

                {/* Legenda dengan jumlah total — identitas tidak bergantung pada warna */}
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3 text-xs">
                    {SEGMENTS.map((s) => (
                        <li key={s.key} className="flex items-center gap-1.5">
                            <span
                                className="h-2.5 w-2.5 rounded-sm"
                                style={{ backgroundColor: s.color }}
                                aria-hidden
                            />
                            <span className="text-muted-foreground">
                                {s.label}
                            </span>
                            <strong className="tabular-nums">
                                {total[s.key]}
                            </strong>
                        </li>
                    ))}
                    <li className="ml-auto">
                        <Link
                            href="/unit-monitoring"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                            Lihat per unit
                        </Link>
                    </li>
                </ul>
            </CardContent>
        </Card>
    );
}
