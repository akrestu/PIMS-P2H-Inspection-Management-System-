import { ChevronRight } from 'lucide-react';
import type { PointerEvent, ReactNode } from 'react';
import { useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 8;

function vibrate(pattern: number | number[]) {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // Vibration API tidak tersedia (iOS/desktop)
    }
}

/**
 * Long-press 450ms (batal bila bergeser > 8px) — docs/03.
 * Mengembalikan handler pointer + `consumeFired()` untuk menelan klik setelah long-press.
 */
export function useLongPress(onLongPress: (() => void) | undefined) {
    const timer = useRef<number | null>(null);
    const origin = useRef<{ x: number; y: number } | null>(null);
    const fired = useRef(false);

    const clear = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    /** true sekali bila long-press baru saja terjadi (klik berikutnya diabaikan). */
    const consumeFired = () => {
        const was = fired.current;
        fired.current = false;

        return was;
    };

    return {
        consumeFired,
        handlers: onLongPress
            ? {
                  onPointerDown: (e: PointerEvent) => {
                      fired.current = false;
                      origin.current = { x: e.clientX, y: e.clientY };
                      clear();
                      timer.current = window.setTimeout(() => {
                          fired.current = true;
                          vibrate(15);
                          onLongPress();
                      }, LONG_PRESS_MS);
                  },
                  onPointerMove: (e: PointerEvent) => {
                      if (
                          origin.current &&
                          Math.hypot(
                              e.clientX - origin.current.x,
                              e.clientY - origin.current.y,
                          ) > MOVE_TOLERANCE
                      ) {
                          clear();
                      }
                  },
                  onPointerUp: clear,
                  onPointerCancel: clear,
                  onPointerLeave: clear,
              }
            : {},
    };
}

/**
 * ListCard (docs/02#listcard): kartu mobile radius 14, min 72px.
 * Ketuk = buka detail. Long-press = masuk mode pilih (bila `onSelectMode`).
 */
export function ListCard({
    title,
    meta,
    trailing,
    leading,
    onOpen,
    selectable = false,
    selected = false,
    onSelectedChange,
    onSelectMode,
    selectLabel,
    className,
}: {
    title: ReactNode;
    meta?: ReactNode;
    /** Biasanya StatusPill. */
    trailing?: ReactNode;
    leading?: ReactNode;
    onOpen?: () => void;
    /** Mode pilih aktif → checkbox tampil, ketuk = toggle. */
    selectable?: boolean;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    onSelectMode?: () => void;
    /** aria-label checkbox, mis. "Pilih DT-1045". */
    selectLabel?: string;
    className?: string;
}) {
    const { consumeFired, handlers } = useLongPress(
        selectable ? undefined : onSelectMode,
    );

    const handleClick = () => {
        if (consumeFired()) {
            return;
        }

        if (selectable) {
            onSelectedChange?.(!selected);
        } else {
            onOpen?.();
        }
    };

    return (
        <div
            className={cn(
                'flex min-h-[72px] items-center gap-3 rounded-xl border-(length:--bw) bg-card px-4 py-3 shadow-sm',
                selected && 'border-foreground bg-brand-soft',
                className,
            )}
        >
            {selectable && (
                <Checkbox
                    checked={selected}
                    onCheckedChange={(v) => onSelectedChange?.(v === true)}
                    aria-label={selectLabel ?? 'Pilih'}
                    className="size-5"
                />
            )}
            <button
                type="button"
                onClick={handleClick}
                onContextMenu={(e) => onSelectMode && e.preventDefault()}
                className="flex min-w-0 flex-1 press items-center gap-3 text-left select-none"
                {...handlers}
            >
                {leading}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                        {title}
                    </span>
                    {meta && (
                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                            {meta}
                        </span>
                    )}
                </span>
                {trailing}
                {!selectable && onOpen && (
                    <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                )}
            </button>
        </div>
    );
}
