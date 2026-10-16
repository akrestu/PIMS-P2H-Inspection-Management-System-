import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(
        () => typeof navigator !== 'undefined' && !navigator.onLine,
    );

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline) {
        return null;
    }

    // docs/02 OfflineBanner: kuning lembut, ikon + label, role=status
    return (
        <div
            role="status"
            className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm text-foreground shadow-sm hc:border-b-2 hc:border-warning"
        >
            <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
            <span>
                <span className="font-semibold">Anda sedang offline.</span> Data
                mungkin belum terbaru; kirim perubahan setelah sinyal kembali.
            </span>
        </div>
    );
}
