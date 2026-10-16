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

    return (
        <div
            role="radiogroup"
            aria-label="Tema"
            className={cn(
                'grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-flex',
                className,
            )}
            {...props}
        >
            {APPEARANCE_OPTIONS.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={appearance === value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'press flex min-h-10 items-center rounded-md px-3.5 py-1.5',
                        appearance === value
                            ? 'bg-background text-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <Icon className="-ml-1 h-4 w-4" />
                    <span className="ml-1.5 text-sm font-medium">{label}</span>
                </button>
            ))}
        </div>
    );
}
