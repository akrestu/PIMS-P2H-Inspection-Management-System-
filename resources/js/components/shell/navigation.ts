import { usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    BarChart3,
    Bell,
    CalendarCheck,
    Car,
    ClipboardCheck,
    ClipboardPlus,
    FileText,
    History,
    House,
    LayoutGrid,
    MapPin,
    MessageSquareText,
    Radio,
    Settings2,
    ShieldCheck,
    Timer,
    User,
    Users,
    Wrench,
} from 'lucide-react';
import { PAGE_TAB_GROUPS } from '@/components/page-tabs';
import { useCurrentUrl } from '@/hooks/use-current-url';

/**
 * Konfigurasi navigasi PIMS (docs/02#appshell, docs/06#navigasi) — satu sumber
 * untuk Sidebar desktop dan BottomNav mobile. URL tetap memakai rute yang ada.
 */
export type ShellNavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    /** Angka di kanan item. `alert` = badge merah (butuh tindakan), selain itu abu. */
    count?: number;
    alert?: boolean;
    /** URL lain (tab halaman) yang juga menandai item ini aktif. */
    activeMatch?: string[];
};

export type ShellNavGroup = {
    /** Tanpa label = grup utama. */
    label?: string;
    items: ShellNavItem[];
};

type SharedProps = {
    auth: {
        user: {
            name: string;
            roles: string[];
            can_approve?: boolean;
            can_monitor?: boolean;
            jabatan?: string | null;
        } | null;
    };
    notifications?: { unread_count?: number; pending_approvals?: number };
    options?: { unit_analytics?: boolean };
};

const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    driver: 'Driver',
};

export const ACCOUNT_HREF = '/settings/profile';

export function useShellNavigation() {
    const { auth, notifications, options } = usePage<SharedProps>().props;
    const { isCurrentUrl } = useCurrentUrl();

    const roles = auth.user?.roles ?? [];
    const isAdmin = roles.includes('admin');
    const isManager = isAdmin || roles.includes('manager');
    const isDriver = roles.includes('driver');
    const canApprove = !!auth.user?.can_approve;
    // Staf pemantau (driver approval / user LV 2) — User::canViewMonitoring
    const canMonitor = !!auth.user?.can_monitor;
    const pending = notifications?.pending_approvals ?? 0;
    const unread = notifications?.unread_count ?? 0;

    const homeHref = isManager ? '/dashboard' : '/driver/dashboard';

    const item = {
        home: {
            title: isManager ? 'Dashboard' : 'Beranda',
            href: homeHref,
            icon: isManager ? LayoutGrid : House,
        },
        live: {
            title: 'Monitoring P2H',
            href: '/monitoring-p2h',
            icon: Radio,
        },
        monitoring: {
            title: 'Kepatuhan',
            href: '/p2h-compliance',
            icon: CalendarCheck,
            activeMatch: PAGE_TAB_GROUPS.p2hMonitoring.map((t) => t.href),
        },
        history: { title: 'Riwayat P2H', href: '/p2h', icon: History },
        fill: { title: 'Isi P2H', href: '/p2h/form', icon: ClipboardPlus },
        approvals: {
            title: 'Persetujuan',
            href: '/p2h/approvals',
            icon: ClipboardCheck,
            count: pending,
            alert: true,
        },
        findings: {
            title: isManager ? 'Temuan' : 'Temuan unit saya',
            href: '/p2h/findings',
            icon: Wrench,
        },
        notifications: {
            title: 'Notifikasi',
            href: '/notifications',
            icon: Bell,
            count: unread,
        },
        dailySummary: {
            title: 'Ringkasan harian',
            href: '/p2h/daily-summary',
            icon: MessageSquareText,
        },
        periodReport: {
            title: 'Laporan periode',
            href: '/p2h/period-report',
            icon: FileText,
        },
        analytics: {
            title: 'Analitik unit',
            href: '/unit-analytics',
            icon: BarChart3,
        },
        pa: { title: 'Monitoring PA', href: '/monitoring', icon: Activity },
        downtime: { title: 'Downtime', href: '/downtime', icon: Timer },
        units: { title: 'Unit', href: '/units', icon: Car },
        sites: { title: 'Site', href: '/sites', icon: MapPin },
        users: { title: 'Pengguna & driver', href: '/users', icon: Users },
        audit: { title: 'Audit log', href: '/audit-log', icon: ShieldCheck },
        settings: {
            title: 'Pengaturan',
            href: '/app-settings',
            icon: Settings2,
        },
        account: { title: 'Akun', href: ACCOUNT_HREF, icon: User },
    } satisfies Record<string, ShellNavItem>;

    const showMonitoring = isManager || canMonitor;

    const groups: ShellNavGroup[] = [
        {
            items: [
                item.home,
                ...(showMonitoring ? [item.live, item.monitoring] : []),
                item.history,
                ...(canApprove ? [item.approvals] : []),
                item.findings,
                item.notifications,
                // Manager mengisi P2H dari Dashboard/Unit; driver lewat bottom nav
                ...(isManager ? [] : [item.fill]),
            ],
        },
        ...(isManager
            ? [
                  {
                      label: 'Laporan',
                      items: [
                          item.dailySummary,
                          item.periodReport,
                          ...(options?.unit_analytics ? [item.analytics] : []),
                          item.pa,
                          item.downtime,
                      ],
                  },
                  {
                      label: 'Data master',
                      items: [item.units, item.sites, item.users],
                  },
              ]
            : canMonitor
              ? [{ label: 'Laporan', items: [item.pa] }]
              : []),
        ...(isAdmin
            ? [{ label: 'Admin', items: [item.audit, item.settings] }]
            : []),
    ];

    /*
     * Bottom nav mobile (docs/02#appshell):
     * - Driver: Beranda, Riwayat, [Isi P2H], Notifikasi, Akun (atau Lainnya bila punya menu tambahan)
     * - Manager/Admin: Beranda, Monitoring, Temuan, Persetujuan, Lainnya
     */
    let bottom: ShellNavItem[];
    let more: ShellNavItem[] = [];

    if (isManager) {
        bottom = [
            { ...item.home, title: 'Beranda' },
            { ...item.live, title: 'Monitoring' },
            item.findings,
            canApprove ? item.approvals : item.history,
        ];
        more = groups
            .flatMap((g) => g.items)
            .filter((i) => !bottom.some((b) => b.href === i.href));
        more.push(item.account);
    } else {
        bottom = [
            item.home,
            { ...item.history, title: 'Riwayat' },
            item.notifications,
        ];

        if (canApprove || canMonitor) {
            more = [
                ...(canApprove ? [item.approvals] : []),
                ...(canMonitor ? [item.live, item.monitoring, item.pa] : []),
                item.findings,
                item.account,
            ];
        } else {
            bottom.push(item.account);
        }
    }

    const isActive = (nav: ShellNavItem) =>
        isCurrentUrl(nav.href) ||
        (nav.activeMatch ?? []).some((href) => isCurrentUrl(href));

    return {
        user: auth.user,
        roleLabel: ROLE_LABEL[roles[0] ?? ''] ?? 'Pengguna',
        isManager,
        isDriver,
        homeHref,
        groups,
        bottom,
        more,
        fill: item.fill,
        account: item.account,
        notifications: item.notifications,
        isActive,
    };
}
