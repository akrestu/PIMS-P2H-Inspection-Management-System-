import { Link } from '@inertiajs/react';
import NotificationBell from '@/components/Layout/NotificationBell';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { useShellNavigation } from './navigation';
import { ShellLogo } from './sidebar';

/**
 * Bar atas (docs/02#appshell).
 * - Mobile: app bar blur 64 — judul halaman + notifikasi + avatar (ke Akun).
 * - Desktop: tidak ada bar atas — judul & aksi ada di PageHeader tiap halaman
 *   (design/screens/*-Desktop.png); notifikasi lewat sidebar.
 */
export function ShellTopBar({
    breadcrumbs = [],
    hideOnMobile = false,
}: {
    breadcrumbs?: BreadcrumbItem[];
    /** Halaman alur layar penuh (Form P2H) punya app bar sendiri di mobile. */
    hideOnMobile?: boolean;
}) {
    const { user, account, bottom } = useShellNavigation();
    const getInitials = useInitials();
    const title = breadcrumbs.at(-1)?.title;
    // Notifikasi sudah ada di bottom nav driver → tidak perlu diulang di app bar
    const bellInBottom = bottom.some((i) => i.href === '/notifications');

    return (
        <header
            className={cn(
                'sticky top-0 z-30 blurbar lg:hidden',
                hideOnMobile && 'hidden',
            )}
        >
            {/* Mobile */}
            <div className="flex h-16 items-center gap-2 px-4 lg:hidden">
                <div className="min-w-0 flex-1">
                    {title ? (
                        <p className="truncate text-xl font-extrabold tracking-[-0.02em]">
                            {title}
                        </p>
                    ) : (
                        <ShellLogo />
                    )}
                </div>
                {!bellInBottom && <NotificationBell />}
                {user && (
                    <Link
                        href={account.href}
                        aria-label="Akun saya"
                        className="grid size-10 press place-items-center rounded-full bg-muted text-[13px] font-semibold"
                    >
                        {getInitials(user.name)}
                    </Link>
                )}
            </div>
        </header>
    );
}
