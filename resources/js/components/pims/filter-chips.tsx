import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChipOption<T extends string> = {
    value: T;
    label: string;
    count?: number;
};

/**
 * FilterChips (docs/02#filterchips): chip 40 mobile / 34 desktop,
 * aktif = bg primary. Satu baris, bisa digeser horizontal di mobile.
 */
export function FilterChips<T extends string>({
    options,
    value,
    onChange,
    label,
    className,
}: {
    options: ChipOption<T>[];
    value: T | T[];
    onChange: (value: T) => void;
    /** Label grup untuk pembaca layar. */
    label: string;
    className?: string;
}) {
    const selected = Array.isArray(value) ? value : [value];

    return (
        <div
            role="group"
            aria-label={label}
            className={cn('noscroll flex gap-2 overflow-x-auto', className)}
        >
            {options.map((opt) => {
                const active = selected.includes(opt.value);

                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'inline-flex h-10 press items-center gap-1.5 rounded-full border-(length:--bw) px-3.5 text-sm font-medium whitespace-nowrap lg:h-[34px] lg:text-[13px]',
                            active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-background text-foreground hover:bg-muted',
                        )}
                    >
                        {opt.label}
                        {opt.count !== undefined && (
                            <span className="opacity-70">{opt.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** Baris filter aktif: chip gelap dengan tombol hapus + "Reset". */
export function ActiveFilters({
    items,
    onRemove,
    onReset,
    className,
}: {
    items: { key: string; label: string }[];
    onRemove: (key: string) => void;
    onReset?: () => void;
    className?: string;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="text-xs text-muted-foreground">Aktif:</span>
            {items.map((item) => (
                <span
                    key={item.key}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-foreground pr-1 pl-3 text-xs font-medium text-background"
                >
                    {item.label}
                    <button
                        type="button"
                        onClick={() => onRemove(item.key)}
                        aria-label={'Hapus filter ' + item.label}
                        className="grid size-6 press place-items-center rounded-full hover:bg-background/20"
                    >
                        <X className="size-3.5" />
                    </button>
                </span>
            ))}
            {onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    className="text-xs font-semibold underline underline-offset-4"
                >
                    Reset
                </button>
            )}
        </div>
    );
}
