import { FlashToastListener } from '@/components/flash-toast-listener';
import { OfflineBanner } from '@/components/offline-banner';
import PageLoader from '@/components/page-loader';
import { SessionTimeoutWarning } from '@/components/session-timeout-warning';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {/* Must be inside Inertia tree so usePage() works */}
            <PageLoader />
            <FlashToastListener />
            <OfflineBanner />
            <SessionTimeoutWarning />
            {children}
        </AppLayoutTemplate>
    );
}
