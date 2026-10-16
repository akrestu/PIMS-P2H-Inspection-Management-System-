import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * BulkBar (docs/02#datatable): bar gelap mengambang `sticky bottom-4`,
 * "N dipilih" + aksi + tombol tutup. Muncul bila ≥ 1 baris dipilih.
 */
export function BulkBar({
    count,
    onClear,
    children,
    className,
}: {
    count: number;
    onClear: () => void;
    children: ReactNode;
    className?: string;
}) {
    if (count === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'pointer-events-none sticky bottom-24 z-30 flex justify-center lg:bottom-4',
                className,
            )}
        >
            <div
                role="toolbar"
                aria-label="Aksi massal"
                className="pointer-events-auto flex animate-fade-up items-center gap-1 rounded-[14px] bg-ink p-1.5 pl-4 text-ink-foreground shadow-lg dark:ring-1 dark:ring-white/10 hc:outline-2 hc:outline-white"
            >
                <span aria-live="polite" className="mr-2 text-sm font-semibold">
                    {count} dipilih
                </span>
                {children}
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Batalkan pilihan"
                    className="ml-1 grid size-10 press place-items-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}

/** Tombol di dalam BulkBar: `default` (putih transparan), `primary` (kuning), `danger` (teks merah muda). */
export function BulkAction({
    tone = 'default',
    className,
    ...props
}: ComponentProps<'button'> & { tone?: 'default' | 'primary' | 'danger' }) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex h-10 press items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold whitespace-nowrap disabled:opacity-40 [&_svg]:size-4',
                tone === 'default' &&
                    'bg-white/10 text-white hover:bg-white/15',
                tone === 'danger' &&
                    'bg-white/10 text-ink-danger hover:bg-white/15',
                tone === 'primary' && 'bg-brand text-brand-foreground',
                className,
            )}
            {...props}
        />
    );
}
