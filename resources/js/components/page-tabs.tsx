import { Link, usePage } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type PageTab = {
    title: string;
    href: string;
    // Hanya admin/manager (sesuai middleware route)
    managerOnly?: boolean;
};

// Halaman-halaman terpisah yang ditampilkan sebagai satu menu bertab
export const PAGE_TAB_GROUPS = {
    p2hMonitoring: [
        { title: 'Kepatuhan P2H', href: '/p2h-compliance' },
        { title: 'Harian Unit', href: '/unit-monitoring', managerOnly: true },
    ],
    unitPerformance: [
        { title: 'Monitoring PA', href: '/monitoring' },
        { title: 'Analitik Unit', href: '/unit-analytics', managerOnly: true },
        { title: 'Downtime Log', href: '/downtime', managerOnly: true },
    ],
    p2hReport: [
        { title: 'Harian', href: '/p2h/daily-summary', managerOnly: true },
        { title: 'Periode', href: '/p2h/period-report', managerOnly: true },
    ],
} satisfies Record<string, PageTab[]>;

export type PageTabGroup = keyof typeof PAGE_TAB_GROUPS;

export function pageTabHrefs(group: PageTabGroup): string[] {
    return PAGE_TAB_GROUPS[group].map((tab) => tab.href);
}

export function PageTabs({ group }: { group: PageTabGroup }) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>()
        .props;
    const { isCurrentUrl } = useCurrentUrl();
    const roles = auth?.user?.roles ?? [];
    const isManager = roles.includes('admin') || roles.includes('manager');

    const tabs = (PAGE_TAB_GROUPS[group] as PageTab[]).filter(
        (tab) => !tab.managerOnly || isManager,
    );

    if (tabs.length < 2) {
        return null;
    }

    return (
        <nav
            aria-label="Sub-menu"
            className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
        >
            <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                {tabs.map((tab) => {
                    const active = isCurrentUrl(tab.href);

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                                active
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.title}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
