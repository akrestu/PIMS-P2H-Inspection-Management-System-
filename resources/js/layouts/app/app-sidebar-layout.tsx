import { ShellBottomNav } from '@/components/shell/bottom-nav';
import { ShellSidebar } from '@/components/shell/sidebar';
import { ShellTopBar } from '@/components/shell/top-bar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { AppLayoutProps } from '@/types';

/**
 * AppShell PIMS (docs/02#appshell):
 * - Desktop (lg+): sidebar 264 sticky + konten.
 * - Mobile: app bar blur + konten + bottom nav (disembunyikan di Form P2H,
 *   yang punya footer aksi sendiri).
 */
export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { currentUrl } = useCurrentUrl();
    const fullscreenFlow = 
        currentUrl.startsWith('/p2h/form') ||
        currentUrl.startsWith('/p2h/terkirim/');
    // Beranda driver punya header sapaan + avatar sendiri (BerandaDriver.png)
    const ownHeader = currentUrl.startsWith('/driver/dashboard');

    return (
        <div className="flex min-h-svh w-full bg-background">
            <ShellSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
                <ShellTopBar
                    breadcrumbs={breadcrumbs}
                    hideOnMobile={fullscreenFlow || ownHeader}
                />
                <main
                    id="main-content"
                    className={
                        fullscreenFlow
                            ? 'flex flex-1 flex-col'
                            : 'flex flex-1 flex-col pb-28 lg:pb-0'
                    }
                >
                    {children}
                </main>
            </div>
            {!fullscreenFlow && <ShellBottomNav />}
        </div>
    );
}
