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
    MapPin,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import type { NavGroup } from '@/components/nav-main';
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

export function AppSidebar() {
    const { auth, notifications } = usePage<{
        auth: { user: { roles: string[]; jabatan?: string | null } | null };
        notifications: { unread_count: number; pending_approvals?: number };
    }>().props;

    const roles: string[] = auth?.user?.roles ?? [];
    const isAdmin = roles.includes('admin');
    const isDriver = roles.includes('driver');
    const isAdminOrManager = isAdmin || roles.includes('manager');
    const jabatan = auth?.user?.jabatan ?? null;
    const isStaff = jabatan === 'Staff' || jabatan === 'Sr.Staff';
    const canApprove = isStaff || isAdminOrManager;
    const pendingApprovals = notifications?.pending_approvals ?? 0;
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
                              title: 'Site',
                              href: '/sites',
                              icon: MapPin,
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
                          ...(isStaff
                              ? [
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
                                ]
                              : []),
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
                ...(canApprove
                    ? [
                          {
                              title: 'Persetujuan P2H',
                              href: '/p2h/approvals',
                              icon: ClipboardCheck,
                              badge: pendingApprovals,
                          },
                      ]
                    : []),
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
                            className="rounded-xl transition-colors hover:bg-sidebar-accent/50"
                            tooltip={{
                                children: 'PIMS — P2H & Inspection System',
                            }}
                        >
                            <Link
                                href={
                                    isAdminOrManager
                                        ? dashboard()
                                        : isDriver
                                          ? driverDashboard()
                                          : '/p2h/form'
                                }
                                prefetch
                            >
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
            <SidebarFooter className="gap-2 border-t border-sidebar-border/50 px-2 pt-3 pb-3">
                {/* Notification count strip — visible only when expanded */}
                {unreadCount > 0 && !isCollapsed && (
                    <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 group-data-[collapsible=icon]:hidden dark:bg-red-950/30">
                        <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs text-red-700 dark:text-red-400">
                                {unreadCount} notifikasi belum dibaca
                            </span>
                        </div>
                        <Badge
                            variant="destructive"
                            className="h-5 px-1.5 text-[10px]"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    </div>
                )}

                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
