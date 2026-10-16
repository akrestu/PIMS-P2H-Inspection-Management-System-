import { Link } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import type { ShellNavItem } from './navigation';
import { useShellNavigation } from './navigation';

/** Logo + wordmark PIMS. */
export function ShellLogo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <img src="/logo.png" alt="" className="size-8 object-contain" />
            <span className="text-[17px] font-bold tracking-[-0.01em]">
                PIMS
            </span>
        </span>
    );
}

function SidebarLink({
    item,
    active,
}: {
    item: ShellNavItem;
    active: boolean;
}) {
    const Icon = item.icon;
    const count = item.count ?? 0;

    return (
        <li>
            <Link
                href={item.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'relative flex h-10 press items-center gap-3 rounded-[10px] px-3 text-sm',
                    active
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
            >
                {active && (
                    <span
                        aria-hidden
                        className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
                    />
                )}
                <Icon
                    className={cn(
                        'size-[18px] shrink-0',
                        active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                    aria-hidden
                />
                <span className="flex-1 truncate">{item.title}</span>
                {count > 0 &&
                    (item.alert ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white dark:text-background">
                            {count > 99 ? '99+' : count}
                            <span className="sr-only"> menunggu</span>
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                            {count > 99 ? '99+' : count}
                        </span>
                    ))}
            </Link>
        </li>
    );
}

/**
 * Sidebar desktop (docs/02#appshell, design/screens/Sidebar.png):
 * 264px sticky setinggi layar, grup navigasi, kartu akun di bawah.
 */
export function ShellSidebar() {
    const { groups, isActive, user, roleLabel, homeHref } =
        useShellNavigation();
    const getInitials = useInitials();

    return (
        <aside className="sticky top-0 hidden h-svh w-[264px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
            <div className="flex h-16 items-center px-5">
                <Link href={homeHref} aria-label="PIMS — beranda">
                    <ShellLogo />
                </Link>
            </div>

            <nav
                aria-label="Navigasi utama"
                className="flex-1 overflow-y-auto px-3 pb-4"
            >
                {groups.map((group, gi) => (
                    <div
                        key={group.label ?? gi}
                        className={gi > 0 ? 'mt-5' : ''}
                    >
                        {group.label && (
                            <p className="mb-1.5 px-3 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                                {group.label}
                            </p>
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => (
                                <SidebarLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item)}
                                />
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {user && (
                <div className="border-t p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex w-full press items-center gap-3 rounded-[12px] p-2 text-left hover:bg-sidebar-accent">
                            <span
                                aria-hidden
                                className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold"
                            >
                                {getInitials(user.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">
                                    {user.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {roleLabel}
                                </span>
                            </span>
                            <ChevronsUpDown
                                className="size-4 text-muted-foreground"
                                aria-hidden
                            />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            align="start"
                            className="w-60 rounded-xl"
                        >
                            <UserMenuContent user={user as unknown as User} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </aside>
    );
}
