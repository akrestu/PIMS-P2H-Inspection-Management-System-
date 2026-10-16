import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeToggle } from '@/components/theme-toggle';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { useShellNavigation } from './navigation';
import { ShellLogo } from './sidebar';

function NotificationButton() {
    const { notifications } = useShellNavigation();
    const count = notifications.count ?? 0;

    return (
        <Link
            href={notifications.href}
            aria-label={
                count > 0 ? count + ' notifikasi belum dibaca' : 'Notifikasi'
            }
            className="relative grid size-12 press place-items-center rounded-[12px] text-foreground hover:bg-muted lg:size-10 lg:rounded-[10px]"
        >
            <Bell className="size-5" strokeWidth={1.75} aria-hidden />
            {count > 0 && (
                <span
                    aria-hidden
                    className="absolute top-2 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-background lg:top-1 lg:right-1 dark:text-background"
                >
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}

/**
 * Bar atas (docs/02#appshell).
 * - Mobile: app bar blur 64 — judul halaman + notifikasi + avatar (ke Akun).
 * - Desktop: bar tipis breadcrumb + tema + notifikasi, sampai tiap halaman
 *   memakai PageHeader sendiri (Fase 3–6).
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
                'sticky top-0 z-30 border-b blurbar',
                hideOnMobile && 'max-lg:hidden',
            )}
        >
            {/* Mobile */}
            <div className="flex h-16 items-center gap-2 px-4 lg:hidden">
                <div className="min-w-0 flex-1">
                    {title ? (
                        <h1 className="truncate text-xl font-semibold tracking-[-0.01em]">
                            {title}
                        </h1>
                    ) : (
                        <ShellLogo />
                    )}
                </div>
                {!bellInBottom && <NotificationButton />}
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

            {/* Desktop */}
            <div className="hidden h-14 items-center gap-3 px-6 lg:flex">
                <div className="min-w-0 flex-1 truncate">
                    {breadcrumbs.length > 0 && (
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    )}
                </div>
                <ThemeToggle variant="ghost" />
                <NotificationButton />
            </div>
        </header>
    );
}
