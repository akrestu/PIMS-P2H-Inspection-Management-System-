import { useSyncExternalStore } from 'react';

/** Langganan media query, mis. `useMediaQuery('(min-width: 1024px)')`. */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (callback) => {
            const mql = window.matchMedia(query);
            mql.addEventListener('change', callback);

            return () => mql.removeEventListener('change', callback);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}

/** Breakpoint `lg` (1024) — batas sidebar/tabel/drawer kanan (docs/01). */
export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1024px)');
}
