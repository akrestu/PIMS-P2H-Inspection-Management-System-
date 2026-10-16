import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SegmentOption<T extends string> = {
    value: T;
    label: ReactNode;
    disabled?: boolean;
};

/**
 * Segmented (docs/02 Tabs/Segmented): track `muted`, thumb terang.
 * Dipakai untuk rentang (7/30/90 hari), shift, level BBM, dsb.
 */
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
    size = 'default',
    className,
}: {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    size?: 'default' | 'lg';
    className?: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn(
                'inline-flex rounded-[12px] bg-muted p-1 lg:rounded-[10px] hc:border-2 hc:border-foreground',
                className,
            )}
        >
            {options.map((opt) => {
                const active = opt.value === value;

                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={opt.disabled}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'flex-1 press rounded-[9px] px-3 text-sm font-medium whitespace-nowrap disabled:opacity-40 lg:rounded-[7px]',
                            size === 'lg' ? 'h-11' : 'h-10 lg:h-8',
                            active
                                ? 'bg-background text-foreground shadow-md hc:outline-2 hc:outline-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export type ItemResult = 'baik' | 'rusak';

const CHOICES: { value: ItemResult; text: string; icon: typeof Check }[] = [
    { value: 'baik', text: 'Baik', icon: Check },
    { value: 'rusak', text: 'Rusak', icon: X },
];

/**
 * SegmentedChoice Baik/Rusak (docs/02#segmentedchoice) — 52px, untuk checklist P2H.
 * `invalid` menampilkan border merah + shake (item belum dijawab saat kirim).
 */
export function SegmentedChoice({
    value,
    onChange,
    label,
    disabled = false,
    invalid = false,
    className,
}: {
    value: ItemResult | null;
    onChange: (value: ItemResult) => void;
    /** Nama item, dipakai sebagai label grup. */
    label: string;
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            aria-invalid={invalid || undefined}
            className={cn(
                'grid h-13 grid-cols-2 gap-1 rounded-[12px] border-(length:--bw) border-transparent bg-muted p-1',
                invalid && 'animate-shake border-danger',
                className,
            )}
        >
            {CHOICES.map(({ value: v, text, icon: Icon }) => {
                const active = value === v;

                return (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => onChange(v)}
                        className={cn(
                            'flex press items-center justify-center gap-1.5 rounded-[9px] border-(length:--bw) border-transparent text-[15px] font-semibold disabled:opacity-40',
                            !active &&
                                'text-muted-foreground hover:text-foreground',
                            active &&
                                v === 'baik' &&
                                'border-success bg-success-soft text-success shadow-sm hc:bg-background',
                            active &&
                                v === 'rusak' &&
                                'border-danger bg-danger-soft text-danger shadow-sm hc:bg-background',
                        )}
                    >
                        <Icon className="size-4" aria-hidden />
                        {text}
                    </button>
                );
            })}
        </div>
    );
}
