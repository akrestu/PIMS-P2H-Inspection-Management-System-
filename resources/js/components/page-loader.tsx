import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export default function PageLoader() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const startHandler = router.on('start', (e) => {
            if ((e as CustomEvent).detail?.visit?.prefetch) return;
            flushSync(() => setLoading(true));
        });
        const finishHandler = router.on('finish', (e) => {
            if ((e as CustomEvent).detail?.visit?.prefetch) return;
            setLoading(false);
        });

        return () => {
            startHandler();
            finishHandler();
        };
    }, []);

    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="loader" />
        </div>
    );
}
