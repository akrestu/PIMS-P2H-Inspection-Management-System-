import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** ChecklistProgress (docs/02): "Langkah 2 dari 6" + bar + "12/18 item". */
export function ChecklistProgress({
    step,
    totalSteps,
    done,
    total,
    unit = 'item',
    className,
}: {
    step: number;
    totalSteps: number;
    done?: number;
    total?: number;
    unit?: string;
    className?: string;
}) {
    const ratio =
        done !== undefined && total
            ? done / total
            : Math.min(1, step / totalSteps);

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-muted-foreground">
                    Langkah {step} dari {totalSteps}
                </span>
                {done !== undefined && total !== undefined && (
                    <span className="font-semibold" aria-live="polite">
                        {done}/{total} {unit}
                    </span>
                )}
            </div>
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
                aria-label="Kemajuan pengisian"
                className="h-1.5 overflow-hidden rounded-full bg-muted hc:border hc:border-foreground"
            >
                <div
                    className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                    style={{ width: ratio * 100 + '%' }}
                />
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
