import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MobileSidebarTrigger } from '@/components/mobile-sidebar-trigger';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* Add bottom padding on mobile so content isn't hidden behind the bottom nav bar */}
                <div className="pb-20 md:pb-0">
                    {children}
                </div>
            </AppContent>
            {/* Floating bottom nav — mobile only */}
            <MobileSidebarTrigger />
        </AppShell>
    );
}
