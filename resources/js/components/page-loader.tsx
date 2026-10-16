import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * Keadaan memuat (docs/02, docs/03): tampil hanya bila memuat > 300 ms.
 * - Pindah halaman → skeleton di area konten (sidebar & app bar tetap bisa dipakai).
 * - Filter / muat ulang halaman yang sama → konten diredupkan (aria-busy);
 *   progres kuning Inertia tetap jalan di atas.
 */
type Mode = 'idle' | 'page' | 'partial';

export default function PageLoader() {
    const [mode, setMode] = useState<Mode>('idle');

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const main = () => document.getElementById('main-content');

        const clear = () => {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }

            main()?.removeAttribute('aria-busy');
            setMode('idle');
        };

        const offStart = router.on('start', (e) => {
            const visit = (e as CustomEvent).detail?.visit;

            if (visit?.prefetch) {
                return;
            }

            const target = visit?.url instanceof URL ? visit.url.pathname : null;
            const samePage = target === window.location.pathname;

            timer = setTimeout(() => {
                if (samePage) {
                    main()?.setAttribute('aria-busy', 'true');
                }

                setMode(samePage ? 'partial' : 'page');
            }, 300);
        });

        const offFinish = router.on('finish', clear);

        return () => {
            offStart();
            offFinish();
            clear();
        };
    }, []);

    if (mode !== 'page') {
        return null;
    }

    return (
        <div
            role="status"
            aria-label="Memuat halaman"
            className="fixed inset-x-0 top-16 bottom-0 z-20 overflow-hidden bg-background px-4 pt-5 lg:top-14 lg:left-[264px] lg:px-8 lg:pt-8"
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <div className="skeleton h-8 w-56" />
                    <div className="skeleton h-4 w-80 max-w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton h-24" />
                    ))}
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-14" />
                ))}
            </div>
        </div>
    );
}
