import { Moon, Sun } from 'lucide-react';
import { APPEARANCE_OPTIONS } from '@/components/appearance-tabs';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';

/**
 * ThemeToggle
 *
 * Quick button to switch between Terang / Gelap / Kontras tinggi / Sistem.
 * Uses the existing useAppearance hook (localStorage + cookie).
 * Icon animates between Sun and Moon based on resolved theme.
 *
 * Props:
 *   variant — controls button visual style (default: "ghost")
 *   showLabel — show text label next to icon (default: false)
 */
export function ThemeToggle({
    variant = 'ghost',
    showLabel = false,
}: {
    variant?: 'ghost' | 'outline';
    showLabel?: boolean;
}) {
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();

    const options = APPEARANCE_OPTIONS;
    const currentLabel =
        options.find((o) => o.value === resolvedAppearance)?.label ?? '';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={showLabel ? 'sm' : 'icon'}
                    className={`relative transition-colors ${showLabel ? 'gap-2 px-3' : 'h-8 w-8'} `}
                    aria-label="Ganti tema"
                >
                    {/* Sun — visible in light mode, hidden in dark */}
                    <Sun
                        className={`h-4 w-4 transition-all duration-300 ${
                            resolvedAppearance === 'dark'
                                ? 'absolute scale-0 rotate-90 opacity-0'
                                : 'scale-100 rotate-0 opacity-100'
                        } `}
                    />
                    {/* Moon — visible in dark mode, hidden in light */}
                    <Moon
                        className={`h-4 w-4 transition-all duration-300 ${
                            resolvedAppearance === 'dark'
                                ? 'scale-100 rotate-0 opacity-100'
                                : 'absolute scale-0 -rotate-90 opacity-0'
                        } `}
                    />
                    {showLabel && (
                        <span className="text-sm">{currentLabel}</span>
                    )}
                    <span className="sr-only">Ganti tema</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-40">
                {options.map(({ value, icon: Icon, label }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => updateAppearance(value)}
                        className="cursor-pointer gap-2"
                    >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{label}</span>
                        {appearance === value && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground">
                        Saat ini:{' '}
                        <span className="font-medium">
                            {appearance === 'system'
                                ? `Sistem (${currentLabel})`
                                : currentLabel}
                        </span>
                    </p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
