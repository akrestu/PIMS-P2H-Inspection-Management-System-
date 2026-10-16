import { cn } from '@/lib/utils';

/**
 * Switch (docs/02 · pemetaan shadcn): on = `success`, thumb putih bergeser 150ms.
 * Tombol `role="switch"` sehingga bisa dioperasikan keyboard tanpa dependensi.
 */
export function Switch({
    checked,
    onCheckedChange,
    disabled = false,
    label,
    className,
}: {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    /** Nama aksesibel bila tidak ada label teks yang terhubung. */
    label?: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onCheckedChange?.(!checked)}
            className={cn(
                'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-success' : 'bg-muted-foreground/30',
                'hc:border-2 hc:border-foreground',
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'size-[22px] rounded-full bg-white shadow-sm transition-transform duration-150',
                    checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
                )}
            />
        </button>
    );
}
