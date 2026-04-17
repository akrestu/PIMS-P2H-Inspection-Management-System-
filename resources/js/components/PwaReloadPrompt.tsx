import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW registered:', r);
        },
        onRegisterError(error) {
            console.error('SW registration error:', error);
        },
    });

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
            <p className="mb-3 text-sm text-foreground">
                {offlineReady ? (
                    <span>Aplikasi siap digunakan secara offline.</span>
                ) : (
                    <span>Konten baru tersedia. Reload untuk memperbarui.</span>
                )}
            </p>
            <div className="flex gap-2">
                {needRefresh && (
                    <button
                        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        onClick={() => updateServiceWorker(true)}
                    >
                        Reload
                    </button>
                )}
                <button
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    onClick={() => {
                        setOfflineReady(false);
                        setNeedRefresh(false);
                    }}
                >
                    Tutup
                </button>
            </div>
        </div>
    );
}
