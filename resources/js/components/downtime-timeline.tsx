import { useState } from 'react';
import { ChartLegend } from '@/components/pims/chart-card';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type TimelineLog = {
    id: number;
    no_unit: string;
    tipe: 'BD' | 'PM' | 'Servis Berkala';
    jam_mulai: string;
    jam_selesai: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

const TIPE_BAR: Record<TimelineLog['tipe'], string> = {
    BD: 'bg-danger',
    PM: 'bg-info',
    'Servis Berkala': 'bg-info/60',
};

/**
 * Linimasa downtime (docs/02 Chart · Gantt): jalur per unit 28px, batang per periode,
 * garis "sekarang" 2px. Downtime yang masih berjalan memanjang sampai sekarang.
 */
export function DowntimeTimeline({
    logs,
    dateFrom,
    dateTo,
}: {
    logs: TimelineLog[];
    dateFrom?: string;
    dateTo?: string;
}) {
    // Diambil sekali saat render pertama (render harus murni)
    const [now] = useState(() => Date.now());
    const end = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : now;
    const start = dateFrom
        ? new Date(`${dateFrom}T00:00:00`).getTime()
        : end - 7 * DAY;
    const span = Math.max(end - start, DAY);
    const pct = (t: number) =>
        ((Math.min(Math.max(t, start), end) - start) / span) * 100;

    const units = [...new Set(logs.map((l) => l.no_unit))].sort();
    const days = Math.ceil(span / DAY);
    const tickEvery = days > 14 ? Math.ceil(days / 10) : 1;
    const ticks = Array.from(
        { length: Math.floor(days / tickEvery) + 1 },
        (_, i) => start + i * tickEvery * DAY,
    );
    const nowPct = now >= start && now <= end ? pct(now) : null;

    if (units.length === 0) {
        return null;
    }

    return (
        <section
            className="rounded-xl border-(length:--bw) bg-card p-4 shadow-sm lg:p-[18px]"
            aria-label={`Linimasa downtime ${units.length} unit, ${formatDate(start)} sampai ${formatDate(end)}`}
        >
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold">Linimasa downtime</h3>
                <ChartLegend
                    items={[
                        { label: 'BD', color: 'danger' },
                        { label: 'PM / Servis', color: 'info' },
                        {
                            label: 'Sekarang',
                            color: 'foreground',
                            dashed: true,
                        },
                    ]}
                />
            </header>

            <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                    {/* sumbu waktu */}
                    <div className="relative ml-24 h-6 border-b text-[11px] text-muted-foreground">
                        {ticks.map((t) => (
                            <span
                                key={t}
                                className="absolute -translate-x-1/2 whitespace-nowrap"
                                style={{ left: `${pct(t)}%` }}
                            >
                                {formatDate(t, { withYear: false })}
                            </span>
                        ))}
                    </div>

                    <ul className="relative">
                        {nowPct !== null && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute top-0 bottom-0 z-10 ml-24 w-0.5 bg-foreground"
                                style={{
                                    left: `calc((100% - 6rem) * ${nowPct / 100})`,
                                }}
                            />
                        )}
                        {units.map((unit) => (
                            <li
                                key={unit}
                                className="flex h-9 items-center border-b last:border-0"
                            >
                                <span className="w-24 shrink-0 truncate pr-2 text-[13px] font-semibold">
                                    {unit}
                                </span>
                                <span className="relative h-7 flex-1 rounded-md bg-muted-2">
                                    {logs
                                        .filter((l) => l.no_unit === unit)
                                        .map((l) => {
                                            const s = new Date(
                                                l.jam_mulai,
                                            ).getTime();
                                            const e = l.jam_selesai
                                                ? new Date(
                                                      l.jam_selesai,
                                                  ).getTime()
                                                : now;

                                            if (e < start || s > end) {
                                                return null;
                                            }

                                            const left = pct(s);
                                            const width = Math.max(
                                                pct(e) - left,
                                                0.6,
                                            );
                                            const label = `${unit} · ${l.tipe} · ${formatDateTime(l.jam_mulai)} – ${
                                                l.jam_selesai
                                                    ? formatDateTime(
                                                          l.jam_selesai,
                                                      )
                                                    : 'berlangsung'
                                            }`;

                                            return (
                                                <span
                                                    key={l.id}
                                                    role="img"
                                                    aria-label={label}
                                                    title={label}
                                                    className={cn(
                                                        'absolute top-1 bottom-1 rounded-[4px]',
                                                        TIPE_BAR[l.tipe],
                                                        !l.jam_selesai &&
                                                            'bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/.35)_6px_10px)]',
                                                    )}
                                                    style={{
                                                        left: `${left}%`,
                                                        width: `${width}%`,
                                                    }}
                                                />
                                            );
                                        })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
                Menampilkan {logs.length} catatan di halaman ini. Batang
                bergaris = masih berlangsung.
            </p>
        </section>
    );
}
