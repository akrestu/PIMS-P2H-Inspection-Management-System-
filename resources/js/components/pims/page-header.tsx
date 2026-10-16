import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader (docs/02#pageheader): judul 24/28 + subjudul konteks + aksi kanan.
 * Di mobile judul sudah tampil di app bar, jadi h1 di sini hanya untuk pembaca layar.
 */
export function PageHeader({
    title,
    description,
    actions,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cn(
                'flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between',
                className,
            )}
        >
            <div className="min-w-0">
                <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}

/** Judul seksi 18–20/600 dengan meta & aksi opsional ("Lihat semua"). */
export function SectionHeader({
    title,
    meta,
    action,
    className,
}: {
    title: ReactNode;
    meta?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn('flex items-center justify-between gap-3', className)}
        >
            <div className="flex min-w-0 items-baseline gap-2">
                <h2 className="text-lg font-semibold tracking-[-0.01em] lg:text-xl">
                    {title}
                </h2>
                {meta && (
                    <span className="truncate text-[13px] text-muted-foreground">
                        {meta}
                    </span>
                )}
            </div>
            {action}
        </div>
    );
}
