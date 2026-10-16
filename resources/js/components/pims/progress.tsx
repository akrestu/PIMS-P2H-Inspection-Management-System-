import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * ChecklistProgress (docs/02, FormP2H.png): bar bersegmen per langkah,
 * "Langkah 2 dari 6" di kiri, nama langkah atau "12/18 item" di kanan.
 * Segmen langkah berjalan terisi sesuai item yang sudah dijawab.
 */
export function ChecklistProgress({
    step,
    totalSteps,
    done,
    total,
    unit = 'item',
    label,
    className,
}: {
    step: number;
    totalSteps: number;
    done?: number;
    total?: number;
    unit?: string;
    /** Nama langkah berjalan (tampil di kanan bila tidak ada hitungan item). */
    label?: ReactNode;
    className?: string;
}) {
    const hasCount = done !== undefined && total !== undefined && total > 0;
    const currentRatio = hasCount ? done / total : 1;
    const overall = (step - 1 + currentRatio) / totalSteps;

    return (
        <div className={cn('space-y-2', className)}>
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(overall * 100)}
                aria-label="Kemajuan pengisian"
                className="flex gap-1"
            >
                {Array.from({ length: totalSteps }, (_, i) => {
                    const fill =
                        i < step - 1 ? 1 : i === step - 1 ? currentRatio : 0;

                    return (
                        <span
                            key={i}
                            className="h-1 flex-1 overflow-hidden rounded-full bg-muted hc:border hc:border-foreground"
                        >
                            <span
                                className="block h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                                style={{ width: fill * 100 + '%' }}
                            />
                        </span>
                    );
                })}
            </div>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-muted-foreground">
                    Langkah {step} dari {totalSteps}
                </span>
                {hasCount ? (
                    <span className="font-semibold tnum" aria-live="polite">
                        {done}/{total} {unit}
                    </span>
                ) : (
                    label && (
                        <span className="truncate font-semibold">{label}</span>
                    )
                )}
            </div>
        </div>
    );
}

export type TimelineStep = {
    title: ReactNode;
    meta?: ReactNode;
    /** done = selesai, current = sedang berlangsung, danger = eskalasi/ditolak, upcoming = belum. */
    state: 'done' | 'current' | 'danger' | 'upcoming';
};

const DOT: Record<TimelineStep['state'], string> = {
    done: 'bg-foreground',
    current: 'bg-background ring-2 ring-warning ring-inset',
    danger: 'bg-background ring-2 ring-danger ring-inset',
    upcoming: 'bg-background ring-2 ring-muted-foreground/40 ring-inset',
};

/** ApprovalTimeline (docs/02): dikirim → menunggu → eskalasi → disetujui/ditolak. */
export function Timeline({
    steps,
    className,
}: {
    steps: TimelineStep[];
    className?: string;
}) {
    return (
        <ol className={cn('relative', className)}>
            {steps.map((s, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < steps.length - 1 && (
                        <span
                            aria-hidden
                            className="absolute top-4 left-[5px] h-[calc(100%-12px)] w-px bg-border"
                        />
                    )}
                    <span
                        aria-hidden
                        className={cn(
                            'relative mt-1 size-3 shrink-0 rounded-full',
                            DOT[s.state],
                        )}
                    />
                    <div className="min-w-0">
                        <p
                            className={cn(
                                'text-sm font-semibold',
                                s.state === 'danger' && 'text-danger',
                                s.state === 'upcoming' &&
                                    'font-medium text-muted-foreground',
                            )}
                        >
                            {s.title}
                        </p>
                        {s.meta && (
                            <p className="text-xs text-muted-foreground">
                                {s.meta}
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}
