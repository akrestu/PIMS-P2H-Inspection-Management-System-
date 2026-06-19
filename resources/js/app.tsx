import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { toast } from 'sonner';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'auth/login':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Handle non-Inertia error responses (e.g. 403 from SAP/external) — prevent raw HTML modal
router.on('invalid', (event) => {
    const status = (event as CustomEvent).detail?.response?.status;
    event.preventDefault();

    if (status === 403) {
        toast.error('Akses Ditolak', {
            description: 'Form ini sudah diproses atau Anda tidak memiliki izin untuk melakukan aksi ini.',
        });
    } else if (status === 404) {
        toast.error('Tidak Ditemukan', {
            description: 'Halaman atau data yang diminta tidak tersedia.',
        });
    } else if (status && status >= 500) {
        toast.error('Terjadi Kesalahan Server', {
            description: 'Silakan coba beberapa saat lagi atau hubungi administrator.',
        });
    } else {
        toast.error('Terjadi Kesalahan', {
            description: 'Permintaan tidak dapat diproses. Silakan coba lagi.',
        });
    }
});

// This will set light / dark mode on load...
initializeTheme();
