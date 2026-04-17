import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { Link, usePage } from '@inertiajs/react';
import { Bell, ClipboardList, ClipboardPlus, LayoutGrid, Menu, X } from 'lucide-react';

/**
 * MobileSidebarTrigger
 *
 * Visible only on mobile (md:hidden). Renders a bottom navigation bar with:
 * - Quick-access links to the most common pages
 * - A "Menu" button that opens the sidebar Sheet
 *
 * The sidebar Sheet itself is rendered by the existing <AppSidebar> / shadcn
 * SidebarProvider — this component only calls toggleSidebar() to open it.
 */
export function MobileSidebarTrigger() {
    const { toggleSidebar, openMobile, setOpenMobile } = useSidebar();
    const { isCurrentUrl } = useCurrentUrl();
    const { auth, notifications } = usePage<{
        auth: { user: { roles: string[] } | null };
        notifications: { unread_count: number };
    }>().props;

    const roles: string[] = auth?.user?.roles ?? [];
    const isAdminOrManager = roles.includes('admin') || roles.includes('manager');
    const isDriver = roles.includes('driver');
    const unreadCount = notifications?.unread_count ?? 0;

    const dashboardHref = isAdminOrManager ? '/dashboard' : '/driver/dashboard';

    // Quick nav items shown in bottom bar (always visible without opening sidebar)
    const quickLinks = [
        {
            title: 'Dashboard',
            href: dashboardHref,
            icon: LayoutGrid,
            show: isAdminOrManager || isDriver,
        },
        {
            title: 'P2H',
            href: '/p2h/form',
            icon: ClipboardPlus,
            show: true,
        },
        {
            title: 'Riwayat',
            href: '/p2h',
            icon: ClipboardList,
            show: true,
        },
        {
            title: 'Notifikasi',
            href: '/notifications',
            icon: Bell,
            show: true,
            badge: unreadCount,
        },
    ].filter((l) => l.show);

    return (
        /* Only visible on mobile */
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Frosted glass bottom bar */}
            <div className="border-t border-border/60 bg-background/90 backdrop-blur-md px-2 pb-safe pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <nav className="flex items-center justify-around">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        const active = isCurrentUrl(link.href);
                        return (
                            <Link
                                key={link.title}
                                href={link.href}
                                className={`
                                    relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                                    transition-all duration-150 min-w-[56px]
                                    ${active
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }
                                `}
                            >
                                {/* Active pill indicator */}
                                {active && (
                                    <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                                )}
                                <div className="relative">
                                    <Icon
                                        className={`h-5 w-5 transition-transform duration-150 ${
                                            active ? 'scale-110' : ''
                                        }`}
                                    />
                                    {link.badge !== undefined && link.badge > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[9px] font-bold leading-none"
                                        >
                                            {link.badge > 9 ? '9+' : link.badge}
                                        </Badge>
                                    )}
                                </div>
                                <span
                                    className={`text-[10px] font-medium leading-none ${
                                        active ? 'font-semibold' : ''
                                    }`}
                                >
                                    {link.title}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Separator */}
                    <div className="h-8 w-px bg-border/60" />

                    {/* Menu toggle button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className={`
                            relative flex flex-col items-center gap-0.5 h-auto px-3 py-2 rounded-xl min-w-[56px]
                            transition-all duration-150
                            ${openMobile
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                        aria-label={openMobile ? 'Tutup menu' : 'Buka menu'}
                    >
                        <div className="relative h-5 w-5">
                            <Menu
                                className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
                                    openMobile ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                                }`}
                            />
                            <X
                                className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
                                    openMobile ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                                }`}
                            />
                        </div>
                        <span className="text-[10px] font-medium leading-none">
                            {openMobile ? 'Tutup' : 'Menu'}
                        </span>
                    </Button>
                </nav>
            </div>
        </div>
    );
}
