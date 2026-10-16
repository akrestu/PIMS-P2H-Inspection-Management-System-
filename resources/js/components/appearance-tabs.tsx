import type { LucideIcon } from 'lucide-react';
import { Contrast, Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export const APPEARANCE_OPTIONS: {
    value: Appearance;
    icon: LucideIcon;
    label: string;
}[] = [
    { value: 'light', icon: Sun, label: 'Terang' },
    { value: 'dark', icon: Moon, label: 'Gelap' },
    { value: 'hc', icon: Contrast, label: 'Kontras tinggi' },
    { value: 'system', icon: Monitor, label: 'Sistem' },
];

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    // Kartu pratinjau tema (Akun-Desktop.png): latar + garis teks + aksen kuning
    const preview: Record<Appearance, string> = {
        light: 'bg-white border border-zinc-200',
        dark: 'bg-[#0A0A0A]',
        hc: 'bg-white border-2 border-black',
        system: 'bg-[linear-gradient(90deg,#fff_0_50%,#0A0A0A_50%_100%)] border border-zinc-200',
    };
    const line: Record<Appearance, string> = {
        light: 'bg-[#0A0A0A]',
        dark: 'bg-white',
        hc: 'bg-black',
        system: 'bg-zinc-500',
    };

    return (
        <div
            role="radiogroup"
            aria-label="Tema"
            className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}
            {...props}
        >
            {APPEARANCE_OPTIONS.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={appearance === value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'press flex flex-col gap-2.5 rounded-[12px] p-2.5 text-left',
                        appearance === value
                            ? 'ring-2 ring-foreground'
                            : 'ring-1 ring-border hover:ring-foreground/40',
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'flex h-12 items-end gap-1.5 rounded-[8px] p-2',
                            preview[value],
                        )}
                    >
                        <span className={cn('h-1.5 w-12 rounded-full', line[value])} />
                        <span className="h-1.5 w-5 rounded-full bg-[#F4D435]" />
                    </span>
                    <span className="text-sm font-semibold">
                        {value === 'system' ? 'Ikuti sistem' : label}
                    </span>
                </button>
            ))}
        </div>
    );
}
