import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * ChartCard (docs/02#chart): border 1, radius 14, judul 15/600,
 * legenda kanan atas, catatan 12 muted di bawah. Chart di dalamnya (Recharts)
 * wajib punya ringkasan teks (`summary`) untuk pembaca layar.
 */
export function ChartCard({
    title,
    meta,
    legend,
    note,
    summary,
    children,
    className,
}: {
    title: ReactNode;
    meta?: ReactNode;
    legend?: ReactNode;
    note?: ReactNode;
    /** Ringkasan isi chart untuk pembaca layar. */
    summary: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'rounded-xl border-(length:--bw) bg-card p-4 shadow-sm lg:p-[18px]',
                className,
            )}
        >
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <h3 className="text-[15px] font-semibold">{title}</h3>
                    {meta && (
                        <span className="text-xs text-muted-foreground">
                            {meta}
                        </span>
                    )}
                </div>
                {legend}
            </header>
            <div role="img" aria-label={summary}>
                {children}
            </div>
            {note && (
                <p className="mt-3 text-xs text-muted-foreground">{note}</p>
            )}
        </section>
    );
}

/** Legenda: titik warna + label. `color` adalah nama token chart (chart-1…5, danger, chart-ref). */
export function ChartLegend({
    items,
    className,
}: {
    items: { label: string; color: string; dashed?: boolean }[];
    className?: string;
}) {
    return (
        <ul className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
            {items.map((item) => (
                <li
                    key={item.label}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                    {item.dashed ? (
                        <span
                            aria-hidden
                            className="w-3 border-t-2 border-dashed"
                            style={{ borderColor: 'var(--' + item.color + ')' }}
                        />
                    ) : (
                        <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ background: 'var(--' + item.color + ')' }}
                        />
                    )}
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

/** Warna seri chart sebagai CSS var — pakai di prop Recharts (`stroke`, `fill`). */
export const CHART_COLORS = {
    1: 'var(--chart-1)',
    2: 'var(--chart-2)',
    3: 'var(--chart-3)',
    4: 'var(--chart-4)',
    5: 'var(--chart-5)',
    ref: 'var(--chart-ref)',
    danger: 'var(--danger)',
    grid: 'var(--border)',
    axis: 'var(--muted-foreground)',
} as const;
