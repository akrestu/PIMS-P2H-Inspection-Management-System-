import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusPill (docs/02-components.md#statuspill, docs/01 status semantik).
 * Status tidak pernah warna saja: selalu titik/ikon + label.
 */
export type StatusKey =
    | 'ready'
    | 'bd'
    | 'pm'
    | 'servis'
    | 'layak'
    | 'tidak-layak'
    | 'menunggu'
    | 'eskalasi'
    | 'disetujui'
    | 'ditolak'
    | 'open'
    | 'closed'
    | 'belum'
    | 'terlambat'
    | 'lewat-tenggat'
    | 'aktif'
    | 'nonaktif';

type Tone = 'success' | 'danger' | 'info' | 'warning' | 'neutral';

export const STATUS_META: Record<StatusKey, { tone: Tone; label: string }> = {
    ready: { tone: 'success', label: 'Ready' },
    layak: { tone: 'success', label: 'Layak Pakai' },
    disetujui: { tone: 'success', label: 'Disetujui' },
    closed: { tone: 'success', label: 'Closed' },
    aktif: { tone: 'success', label: 'Aktif' },
    bd: { tone: 'danger', label: 'BD' },
    'tidak-layak': { tone: 'danger', label: 'Tidak Layak' },
    ditolak: { tone: 'danger', label: 'Ditolak' },
    eskalasi: { tone: 'danger', label: 'Eskalasi' },
    'lewat-tenggat': { tone: 'danger', label: 'Lewat tenggat' },
    pm: { tone: 'info', label: 'PM' },
    servis: { tone: 'info', label: 'Servis' },
    open: { tone: 'info', label: 'Open' },
    menunggu: { tone: 'warning', label: 'Menunggu' },
    belum: { tone: 'warning', label: 'Belum P2H' },
    terlambat: { tone: 'warning', label: 'Terlambat' },
    nonaktif: { tone: 'neutral', label: 'Nonaktif' },
};

const SOFT: Record<Tone, string> = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    warning: 'bg-warning-soft text-warning',
    neutral: 'bg-muted text-muted-foreground',
};

const SOLID: Record<Tone, string> = {
    success: 'bg-success text-white',
    danger: 'bg-danger text-white dark:text-background',
    info: 'bg-info text-white',
    warning: 'bg-warning text-white',
    neutral: 'bg-foreground text-background',
};

type StatusPillProps = Omit<ComponentProps<'span'>, 'children'> & {
    status: StatusKey;
    /** Ganti label default (mis. "Layak" singkat). */
    label?: string;
    size?: 'sm' | 'md';
    /** Varian solid hanya untuk "Tidak layak" & "KRITIS" (docs/01). */
    solid?: boolean;
    icon?: LucideIcon;
};

export function StatusPill({
    status,
    label,
    size = 'md',
    solid = false,
    icon: Icon,
    className,
    ...props
}: StatusPillProps) {
    const meta = STATUS_META[status];

    return (
        <span
            data-status={status}
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
                'hc:border-2 hc:border-current',
                size === 'md' ? 'h-6 px-2.5 text-xs' : 'h-5 px-2 text-[11px]',
                solid ? SOLID[meta.tone] : SOFT[meta.tone],
                className,
            )}
            {...props}
        >
            {Icon ? (
                <Icon className="size-3.5" aria-hidden />
            ) : (
                <span
                    className="size-1.5 rounded-full bg-current"
                    aria-hidden
                />
            )}
            {label ?? meta.label}
        </span>
    );
}

/** Tag merah solid "KRITIS" untuk item checklist kritis. */
export function KritisTag({
    withIcon = false,
    className,
    ...props
}: ComponentProps<'span'> & { withIcon?: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-danger px-1.5 text-[11px] font-bold tracking-wide text-white uppercase dark:text-background',
                className,
            )}
            {...props}
        >
            {withIcon && <AlertTriangle className="size-3" aria-hidden />}
            Kritis
        </span>
    );
}
