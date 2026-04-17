import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

/**
 * Fires a Sonner toast for a FlashToast payload.
 */
function fireToast(data: FlashToast): void {
    const options = {
        description: data.description,
        duration: data.type === 'error' ? 6000 : 4000,
    };

    switch (data.type) {
        case 'success': toast.success(data.message, options); break;
        case 'error':   toast.error(data.message, options);   break;
        case 'warning': toast.warning(data.message, options); break;
        case 'info':    toast.info(data.message, options);    break;
        default:        toast(data.message, options);
    }
}

export function useFlashToast(): void {
    const { flash } = usePage<{ flash?: FlashToast | null }>().props;

    // Track the last flash we showed so a re-render doesn't re-fire the same toast
    const lastFlashRef = useRef<string | null>(null);

    // ── Source 1: Inertia::flash() events (same-page flash, e.g. profile update) ──
    useEffect(() => {
        return router.on('flash', (event) => {
            const data = (event as CustomEvent).detail?.flash?.toast as FlashToast | undefined;
            if (data) fireToast(data);
        });
    }, []);

    // ── Source 2: Shared prop flash (redirect-based, set in HandleInertiaRequests) ──
    useEffect(() => {
        if (!flash) return;

        // Build a stable key to deduplicate across re-renders
        const key = `${flash.type}:${flash.message}`;
        if (lastFlashRef.current === key) return;

        lastFlashRef.current = key;
        fireToast(flash);

        // Reset key after toast duration so the same message CAN fire again on a future page visit
        const timer = setTimeout(() => {
            lastFlashRef.current = null;
        }, 5000);

        return () => clearTimeout(timer);
    }, [flash]);
}
