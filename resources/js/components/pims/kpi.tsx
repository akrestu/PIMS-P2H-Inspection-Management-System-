import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'danger' | 'warning';

const VALUE_TONE: Record<KpiTone, string> = {
    default: 'text-foreground',
    danger: 'text-danger',
    warning: 'text-warning',
};

const SUB_TONE = {
    default: 'text-muted-foreground',
    danger: 'text-danger font-semibold',
    warning: 'text-warning font-semibold',
    success: 'text-success font-semibold',
};

type KpiCardProps = {
    label: string;
    value: ReactNode;
    /** Satuan kecil di samping angka, mis. "/ 48" atau "%". */
    unit?: ReactNode;
    sub?: ReactNode;
    /** Warna angka hanya foreground / danger / warning (docs/02#kpicard). */
    tone?: KpiTone;
    subTone?: keyof typeof SUB_TONE;
    /** 0–100 → bar progres 4px. */
    progress?: number;
    /** Kartu sebagai filter: render `<button aria-pressed>`. */
    onClick?: () => void;
    active?: boolean;
    /** `card` = kartu berborder (desktop), `plain` = tanpa kartu (strip / mobile). */
    variant?: 'card' | 'plain';
    className?: string;
};

/** KpiCard (docs/02#kpicard). Angka selalu tabular. */
export function KpiCard({
    label,
    value,
    unit,
    sub,
    tone = 'default',
    subTone = 'default',
    progress,
    onClick,
    active = false,
    variant = 'card',
    className,
}: KpiCardProps) {
    const body = (
        <>
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <span
                className={cn(
                    'mt-1 flex items-baseline gap-0.5 leading-none font-semibold tracking-[-0.03em]',
                    variant === 'card'
                        ? 'text-[28px]'
                        : 'text-[36px] lg:text-[40px]',
                    VALUE_TONE[tone],
                )}
            >
                {value}
                {unit && (
                    <span className="text-[0.5em] font-medium tracking-normal text-muted-foreground">
                        {unit}
                    </span>
                )}
            </span>
            {progress !== undefined && (
                <span
                    className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"
                    aria-hidden
                >
                    <span
                        className="block h-full rounded-full bg-chart-1 transition-[width] duration-300"
                        style={{
                            width: `${Math.min(100, Math.max(0, progress))}%`,
                        }}
                    />
                </span>
            )}
            {sub && (
                <span className={cn('mt-1.5 text-xs', SUB_TONE[subTone])}>
                    {sub}
                </span>
            )}
        </>
    );

    const classes = cn(
        'flex min-w-0 flex-col text-left',
        variant === 'card' &&
            'rounded-xl border-(length:--bw) bg-card p-4 shadow-sm',
        onClick && 'press hover:border-foreground/30',
        onClick && active && 'border-foreground',
        className,
    );

    if (onClick) {
        return (
            <button
                type="button"
                aria-pressed={active}
                onClick={onClick}
                className={classes}
            >
                {body}
            </button>
        );
    }

    return <div className={classes}>{body}</div>;
}

/** Grid KPI: 2 kolom mobile, 3–5 kolom di desktop. */
export function KpiStrip({
    cols = 4,
    className,
    ...props
}: ComponentProps<'div'> & { cols?: 3 | 4 | 5 }) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 gap-3',
                cols === 3 && 'lg:grid-cols-3',
                cols === 4 && 'lg:grid-cols-4',
                cols === 5 && 'lg:grid-cols-5',
                className,
            )}
            {...props}
        />
    );
}
