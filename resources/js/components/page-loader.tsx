import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export default function PageLoader() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const startHandler = router.on('start', (e) => {
            if ((e as CustomEvent).detail?.visit?.prefetch) return;
            timer = setTimeout(() => {
                flushSync(() => setLoading(true));
            }, 150);
        });

        const finishHandler = router.on('finish', () => {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            setLoading(false);
        });

        return () => {
            startHandler();
            finishHandler();
            if (timer !== null) clearTimeout(timer);
        };
    }, []);

    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="loader" />
        </div>
    );
}
