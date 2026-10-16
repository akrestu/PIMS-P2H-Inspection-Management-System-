import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

/**
 * TrashTabs (docs/02 · komponen spesifik): "Aktif · n" / "Sampah · n" bergaya
 * segmented. Tiap tab adalah tautan ke halaman daftar aktif / Sampah.
 */
export function TrashTabs({
    activeHref,
    trashHref,
    current,
    counts,
    className,
}: {
    activeHref: string;
    trashHref: string;
    current: 'aktif' | 'sampah';
    counts: { aktif: number; sampah: number };
    className?: string;
}) {
    const tab = (key: 'aktif' | 'sampah', href: string, label: string) => (
        <Link
            href={href}
            aria-current={current === key ? 'page' : undefined}
            className={cn(
                'inline-flex h-10 items-center rounded-[10px] px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:h-8 lg:rounded-[8px]',
                current === key
                    ? 'bg-background font-semibold text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
            )}
        >
            {label} · <span className="ml-1 tnum">{counts[key]}</span>
        </Link>
    );

    return (
        <nav
            aria-label="Aktif atau Sampah"
            className={cn(
                'inline-flex shrink-0 rounded-[12px] bg-muted p-1 lg:rounded-[10px] hc:border-2 hc:border-foreground',
                className,
            )}
        >
            {tab('aktif', activeHref, 'Aktif')}
            {tab('sampah', trashHref, 'Sampah')}
        </nav>
    );
}
