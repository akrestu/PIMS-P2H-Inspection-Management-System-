import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/**
 * Toast PIMS (docs/02#toast): gelap (ink) di semua tema, aksi "Urungkan" kuning.
 * Mobile: di atas bottom nav (offset 96). Desktop: kanan bawah 24px.
 * Durasi 2,6 dtk; 5 dtk bila ada aksi Urungkan (lihat `toastUndo`).
 */
function Toaster({ ...props }: ToasterProps) {
    // Toast selalu gelap: bungkus dengan tema dark agar token status (success/warning/…)
    // memakai nilai terang yang kontras di atas ink.
    return (
        <div data-theme="dark" className="contents">
        <Sonner
            theme="dark"
            className="toaster group"
            position="bottom-right"
            offset={24}
            mobileOffset={{ bottom: 96, left: 16, right: 16 }}
            duration={2600}
            closeButton={false}
            expand={false}
            visibleToasts={3}
            toastOptions={{
                classNames: {
                    toast: 'rounded-[14px] border-0 bg-ink text-ink-foreground shadow-lg text-sm font-medium gap-3 dark:ring-1 dark:ring-white/10 hc:outline-2 hc:outline-white',
                    title: 'font-semibold text-sm',
                    description: 'text-xs mt-0.5 !text-ink-foreground/70',
                    actionButton:
                        '!bg-transparent !text-brand !text-sm !font-semibold !h-8 !px-2 hover:!bg-white/10',
                    cancelButton: '!bg-white/10 !text-ink-foreground !text-xs',
                },
            }}
            icons={{
                success: <CheckCircle2 className="size-4 text-success" />,
                error: <XCircle className="size-4 text-danger" />,
                warning: <AlertTriangle className="size-4 text-warning" />,
                info: <Info className="size-4 text-info" />,
                loading: <Loader2 className="size-4 animate-spin text-ink-foreground/70" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--ink)',
                    '--normal-text': 'var(--ink-foreground)',
                    '--normal-border': 'transparent',
                } as React.CSSProperties
            }
            {...props}
        />
        </div>
    );
}

/**
 * Toast dengan aksi "Urungkan" 5 detik (docs/03: aksi bisa dibatalkan).
 * `onUndo` dipanggil bila pengguna menekan Urungkan.
 */
function toastUndo(message: string, onUndo: () => void, description?: string) {
    return toast(message, {
        description,
        duration: 5000,
        action: { label: 'Urungkan', onClick: onUndo },
    });
}

export { Toaster, toastUndo };
