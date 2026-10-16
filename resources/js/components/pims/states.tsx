import { Link } from '@inertiajs/react';
import { AlertCircle, CloudOff, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** EmptyState (docs/02): judul 18/600 + teks + aksi; motif topo samar. */
export function EmptyState({
    title,
    description,
    action,
    icon,
    topo = true,
    className,
}: {
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    icon?: ReactNode;
    topo?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-(length:--bw) border-dashed px-6 py-12 text-center',
                className,
            )}
        >
            {topo && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[url(/topo-motif.png)] bg-cover bg-center opacity-20 dark:opacity-10 dark:invert"
                />
            )}
            <div className="relative flex flex-col items-center gap-2">
                {icon && (
                    <div className="mb-1 text-muted-foreground">{icon}</div>
                )}
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && (
                    <p className="max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
                {action && <div className="mt-3">{action}</div>}
            </div>
        </div>
    );
}

/** ErrorState: "Data gagal dimuat" + kode + "Coba lagi". */
export function ErrorState({
    title = 'Data gagal dimuat',
    description = 'Server tidak merespons. Periksa sinyal lalu coba lagi.',
    code,
    onRetry,
    className,
}: {
    title?: string;
    description?: ReactNode;
    code?: string | number;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-(length:--bw) px-6 py-12 text-center',
                className,
            )}
        >
            <AlertCircle className="size-6 text-danger" aria-hidden />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
                {description}
                {code !== undefined && (
                    <span className="font-mono"> ({code})</span>
                )}
            </p>
            {onRetry && (
                <Button variant="outline" className="mt-2" onClick={onRetry}>
                    Coba lagi
                </Button>
            )}
        </div>
    );
}

/** OfflineBanner: "Anda sedang offline." + jumlah antrean + jam data terakhir. */
export function OfflineBanner({
    queued = 0,
    lastSync,
    message,
    className,
}: {
    queued?: number;
    /** Jam data terakhir, sudah diformat (`06:02`). */
    lastSync?: string;
    message?: ReactNode;
    className?: string;
}) {
    const detail =
        message ??
        [
            queued > 0 && queued + ' P2H menunggu dikirim.',
            lastSync && 'Data terakhir ' + lastSync + '.',
        ]
            .filter(Boolean)
            .join(' ');

    return (
        <div
            role="status"
            className={cn(
                'flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-foreground hc:border-2 hc:border-warning',
                className,
            )}
        >
            <CloudOff
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
            />
            <p>
                <span className="font-semibold">Anda sedang offline.</span>{' '}
                {detail}
            </p>
        </div>
    );
}

/** Area 403 (docs/02 Forbidden): angka 403 outline dekoratif di desktop. */
export function Forbidden({
    title = 'Halaman khusus Admin',
    description = 'Akun Anda tidak memiliki akses ke halaman ini. Minta akses ke admin bila diperlukan.',
    backHref = '/dashboard',
    backLabel = 'Kembali ke Dashboard',
    className,
}: {
    title?: string;
    description?: ReactNode;
    backHref?: string;
    backLabel?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col items-start gap-3 overflow-hidden rounded-xl border-(length:--bw) p-8 lg:p-12',
                className,
            )}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -bottom-8 hidden text-[160px] leading-none font-semibold tracking-[-0.05em] text-transparent [-webkit-text-stroke:2px_var(--border)] lg:block"
            >
                403
            </span>
            <Lock
                className="relative size-6 text-muted-foreground"
                aria-hidden
            />
            <p className="relative font-mono text-xs text-muted-foreground">
                403 · Akses ditolak
            </p>
            <h1 className="relative text-2xl font-semibold tracking-[-0.02em]">
                {title}
            </h1>
            <p className="relative max-w-[60%] text-sm text-muted-foreground max-lg:max-w-md">
                {description}
            </p>
            <Button asChild variant="outline" className="relative mt-2">
                <Link href={backHref}>{backLabel}</Link>
            </Button>
        </div>
    );
}

/** Tampilkan skeleton hanya bila memuat > 300ms (docs/03). */
export function useDelayedLoading(loading: boolean, delay = 300): boolean {
    const [elapsed, setElapsed] = useState(false);

    useEffect(() => {
        if (!loading) {
            return;
        }

        const t = window.setTimeout(() => setElapsed(true), delay);

        return () => {
            window.clearTimeout(t);
            setElapsed(false);
        };
    }, [loading, delay]);

    return loading && elapsed;
}
