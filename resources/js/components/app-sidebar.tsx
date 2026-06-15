import AppLogo from '@/components/app-logo';
import { NavMain, type NavGroup } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { dashboard as driverDashboard } from '@/routes/driver';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Bell,
    CalendarCheck,
    Car,
    ClipboardList,
    ClipboardPlus,
    ClockAlert,
    LayoutGrid,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';

export function AppSidebar() {
    const { auth, notifications } = usePage<{
        auth: { user: { roles: string[] } | null };
        notifications: { unread_count: number };
    }>().props;

    const roles: string[] = auth?.user?.roles ?? [];
    const isAdmin = roles.includes('admin');
    const isDriver = roles.includes('driver');
    const isAdminOrManager = isAdmin || roles.includes('manager');
    const unreadCount = notifications?.unread_count ?? 0;
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    const navGroups: NavGroup[] = [
        // ── Manajemen (admin/manager only) ───────────────────────
        ...(isAdminOrManager
            ? [
                  {
                      label: 'Manajemen',
                      defaultOpen: true,
                      items: [
                          {
                              title: 'Dashboard',
                              href: dashboard(),
                              icon: LayoutGrid,
                          },
                          {
                              title: 'Monitoring PA',
                              href: '/monitoring',
                              icon: Activity,
                          },
                          {
                              title: 'Monitoring P2H',
                              href: '/p2h-compliance',
                              icon: CalendarCheck,
                          },
                          {
                              title: 'Downtime Log',
                              href: '/downtime',
                              icon: ClockAlert,
                          },
                          {
                              title: 'Unit',
                              href: '/units',
                              icon: Car,
                          },
                          {
                              title: 'Manajemen User',
                              href: '/users',
                              icon: Users,
                          },
                          ...(isAdmin
                              ? [
                                    {
                                        title: 'Audit Log',
                                        href: '/audit-log',
                                        icon: ShieldCheck,
                                    },
                                    {
                                        title: 'Pengaturan Aplikasi',
                                        href: '/app-settings',
                                        icon: Settings2,
                                    },
                                ]
                              : []),
                      ],
                  },
              ]
            : []),

        // ── Driver ──────────────────────────────────────────────
        ...(isDriver
            ? [
                  {
                      label: 'Driver',
                      defaultOpen: true,
                      items: [
                          {
                              title: 'Dashboard Saya',
                              href: driverDashboard(),
                              icon: LayoutGrid,
                          },
                      ],
                  },
              ]
            : []),

        // ── Operasional (all roles) ──────────────────────────────
        {
            label: 'Operasional',
            defaultOpen: true,
            items: [
                {
                    title: 'Form P2H',
                    href: '/p2h/form',
                    icon: ClipboardPlus,
                },
                {
                    title: 'Riwayat P2H',
                    href: '/p2h',
                    icon: ClipboardList,
                },
                {
                    title: 'Notifikasi',
                    href: '/notifications',
                    icon: Bell,
                    badge: unreadCount,
                },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            {/* ── Header / Logo ─────────────────────────────── */}
            <SidebarHeader className="border-b border-sidebar-border/50 pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="rounded-xl hover:bg-sidebar-accent/50 transition-colors"
                            tooltip={{ children: 'PIMS — P2H & Inspection System' }}
                        >
                            <Link href={isAdminOrManager ? dashboard() : isDriver ? driverDashboard() : '/p2h/form'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

            </SidebarHeader>

            {/* ── Navigation ────────────────────────────────── */}
            <SidebarContent className="gap-1 px-2 py-2">
                <NavMain groups={navGroups} />
            </SidebarContent>

            {/* ── Footer / User ─────────────────────────────── */}
            <SidebarFooter className="border-t border-sidebar-border/50 px-2 pt-3 pb-3 gap-2">
                {/* Notification count strip — visible only when expanded */}
                {unreadCount > 0 && !isCollapsed && (
                    <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/30 group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs text-red-700 dark:text-red-400">
                                {unreadCount} notifikasi belum dibaca
                            </span>
                        </div>
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    </div>
                )}

                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
