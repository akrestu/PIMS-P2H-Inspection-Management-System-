import { router, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const WARN_BEFORE_MS = 2 * 60 * 1000; // 2 minutes

export function SessionTimeoutWarning() {
    const { options } = usePage().props;
    const sessionMs =
        ((options as any)?.session_lifetime_minutes ?? 120) * 60 * 1000;

    const [showWarning, setShowWarning] = useState(false);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleWarning = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }

        setShowWarning(false);
        warningTimerRef.current = setTimeout(
            () => {
                setShowWarning(true);
            },
            Math.max(0, sessionMs - WARN_BEFORE_MS),
        );
    }, [sessionMs]);

    const handleRefresh = () => {
        router.reload();
        scheduleWarning();
    };

    useEffect(() => {
        warningTimerRef.current = setTimeout(
            () => {
                setShowWarning(true);
            },
            Math.max(0, sessionMs - WARN_BEFORE_MS),
        );

        const handleActivity = () => scheduleWarning();
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach((e) =>
            window.addEventListener(e, handleActivity, { passive: true }),
        );

        return () => {
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }

            events.forEach((e) =>
                window.removeEventListener(e, handleActivity),
            );
        };
    }, [scheduleWarning, sessionMs]);

    if (!showWarning) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:w-80">
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg dark:border-amber-700 dark:bg-amber-950/80">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Sesi akan berakhir
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                        Sesi Anda akan habis dalam 2 menit karena tidak ada
                        aktivitas.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleRefresh}
                        >
                            Lanjutkan Sesi
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setShowWarning(false)}
                        >
                            Tutup
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
