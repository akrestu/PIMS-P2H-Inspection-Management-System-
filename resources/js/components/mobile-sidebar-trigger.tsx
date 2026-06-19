import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Bell,
    CalendarCheck,
    Car,
    ClipboardCheck,
    ClipboardList,
    ClipboardPlus,
    ClockAlert,
    LayoutGrid,
    MoreHorizontal,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';

type NavItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
};

/**
 * MobileSidebarTrigger
 *
 * Visible only on mobile (md:hidden). Renders a role-aware bottom navigation bar.
 * Admin/Manager: 4 primary items + "Lainnya" sheet for secondary items.
 * Driver: up to 5 items (all fit in bottom bar, no sheet needed).
 */
export function MobileSidebarTrigger() {
    const [showMore, setShowMore] = useState(false);
    const { isCurrentUrl } = useCurrentUrl();
    const { auth, notifications } = usePage<{
        auth: { user: { roles: string[]; jabatan?: string | null } | null };
        notifications: { unread_count: number; pending_approvals?: number };
    }>().props;

    const roles: string[] = auth?.user?.roles ?? [];
    const isAdmin = roles.includes('admin');
    const isAdminOrManager = isAdmin || roles.includes('manager');
    const isDriver = roles.includes('driver');
    const jabatan = auth?.user?.jabatan ?? null;
    const isStaff = jabatan === 'Staff' || jabatan === 'Sr.Staff';
    const canApprove = isStaff || isAdminOrManager;
    const unreadCount = notifications?.unread_count ?? 0;
    const pendingApprovals = notifications?.pending_approvals ?? 0;

    let primaryNav: NavItem[] = [];
    let moreNav: NavItem[] = [];

    if (isAdminOrManager) {
        primaryNav = [
            { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
            { title: 'Monitoring', href: '/monitoring', icon: Activity },
            { title: 'Form P2H', href: '/p2h/form', icon: ClipboardPlus },
            { title: 'Persetujuan', href: '/p2h/approvals', icon: ClipboardCheck, badge: pendingApprovals },
        ];
        moreNav = [
            { title: 'Monitoring P2H', href: '/p2h-compliance', icon: CalendarCheck },
            { title: 'Downtime Log', href: '/downtime', icon: ClockAlert },
            { title: 'Riwayat P2H', href: '/p2h', icon: ClipboardList },
            { title: 'Unit', href: '/units', icon: Car },
            { title: 'Manajemen User', href: '/users', icon: Users },
            { title: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
            ...(isAdmin
                ? [
                      { title: 'Audit Log', href: '/audit-log', icon: ShieldCheck },
                      { title: 'Pengaturan', href: '/app-settings', icon: Settings2 },
                  ]
                : []),
        ];
    } else if (isDriver && canApprove) {
        primaryNav = [
            { title: 'Dashboard', href: '/driver/dashboard', icon: LayoutGrid },
            { title: 'Form P2H', href: '/p2h/form', icon: ClipboardPlus },
            { title: 'Riwayat', href: '/p2h', icon: ClipboardList },
            { title: 'Persetujuan', href: '/p2h/approvals', icon: ClipboardCheck, badge: pendingApprovals },
        ];
        moreNav = [
            { title: 'Monitoring P2H', href: '/p2h-compliance', icon: CalendarCheck },
            { title: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        ];
    } else if (isDriver) {
        primaryNav = [
            { title: 'Dashboard', href: '/driver/dashboard', icon: LayoutGrid },
            { title: 'Form P2H', href: '/p2h/form', icon: ClipboardPlus },
            { title: 'Riwayat', href: '/p2h', icon: ClipboardList },
            { title: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        ];
    } else {
        // Fallback for any other role/jabatan combo
        primaryNav = [
            { title: 'Form P2H', href: '/p2h/form', icon: ClipboardPlus },
            { title: 'Riwayat', href: '/p2h', icon: ClipboardList },
            ...(canApprove
                ? [{ title: 'Persetujuan', href: '/p2h/approvals', icon: ClipboardCheck, badge: pendingApprovals }]
                : []),
            { title: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        ];
    }

    const hasMore = moreNav.length > 0;
    const moreHasBadge = moreNav.some((i) => (i.badge ?? 0) > 0);

    return (
        <>
            {/* Bottom navigation bar — mobile only */}
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="border-t border-border/60 bg-background/90 backdrop-blur-md px-2 pb-safe pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <nav className="flex items-center justify-around">
                        {primaryNav.map((link) => {
                            const Icon = link.icon;
                            const active = isCurrentUrl(link.href);
                            return (
                                <Link
                                    key={link.title}
                                    href={link.href}
                                    className={`relative flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-all duration-150 min-w-[60px] ${
                                        active
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {active && (
                                        <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                                    )}
                                    <div className="relative">
                                        <Icon
                                            className={`h-7 w-7 transition-transform duration-150 ${
                                                active ? 'scale-110' : ''
                                            }`}
                                        />
                                        {(link.badge ?? 0) > 0 && (
                                            <Badge
                                                variant="destructive"
                                                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[9px] font-bold leading-none"
                                            >
                                                {(link.badge ?? 0) > 9 ? '9+' : link.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs leading-none ${
                                            active ? 'font-semibold' : 'font-medium'
                                        }`}
                                    >
                                        {link.title}
                                    </span>

                                </Link>
                            );
                        })}

                        {hasMore && (
                            <button
                                onClick={() => setShowMore(true)}
                                className="relative flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-all duration-150 min-w-[60px] text-muted-foreground hover:text-foreground"
                            >
                                <div className="relative">
                                    <MoreHorizontal className="h-7 w-7" />
                                    {moreHasBadge && (
                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                                    )}
                                </div>
                                <span className="text-xs font-medium leading-none">Lainnya</span>
                            </button>
                        )}
                    </nav>
                </div>
            </div>

            {/* "Lainnya" bottom sheet for secondary nav items */}
            {hasMore && (
                <Sheet open={showMore} onOpenChange={setShowMore}>
                    <SheetContent
                        side="bottom"
                        className="rounded-t-2xl px-4 pb-8 md:hidden"
                    >
                        <SheetHeader className="mb-4 pb-2 border-b border-border/50">
                            <SheetTitle className="text-sm text-left">Menu Lainnya</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-4 gap-2">
                            {moreNav.map((link) => {
                                const Icon = link.icon;
                                const active = isCurrentUrl(link.href);
                                return (
                                    <Link
                                        key={link.title}
                                        href={link.href}
                                        onClick={() => setShowMore(false)}
                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150 ${
                                            active
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                        }`}
                                    >
                                        <div className="relative">
                                            <Icon className="h-6 w-6" />
                                            {(link.badge ?? 0) > 0 && (
                                                <Badge
                                                    variant="destructive"
                                                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[9px] font-bold leading-none"
                                                >
                                                    {(link.badge ?? 0) > 9 ? '9+' : link.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-medium text-center leading-tight">
                                            {link.title}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </SheetContent>
                </Sheet>
            )}
        </>
    );
}
