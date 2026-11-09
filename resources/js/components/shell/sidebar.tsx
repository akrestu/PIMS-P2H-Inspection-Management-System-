import { Link } from '@inertiajs/react';
import { ChevronsUpDown, Monitor, Moon, PanelLeft, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/Layout/NotificationBell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useShellNavigation } from './navigation';
import type { ShellNavItem } from './navigation';

const COLLAPSED_KEY = 'pims.sidebar.collapsed';

const readCollapsed = (): boolean => {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
};

/** Logo + wordmark PIMS. */
export function ShellLogo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <img
                src="/images/pims-logo.png"
                alt=""
                className="size-8 object-contain"
            />
            <span className="text-[17px] font-bold tracking-[-0.01em]">
                PIMS
            </span>
        </span>
    );
}

const THEMES: { value: Appearance; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Tema terang', icon: Sun },
    { value: 'dark', label: 'Tema gelap', icon: Moon },
    { value: 'system', label: 'Ikuti sistem', icon: Monitor },
];

function ThemeSwitch() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            role="group"
            aria-label="Tema tampilan"
            className="mr-auto inline-flex gap-0.5 rounded-full bg-muted p-0.5"
        >
            {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    type="button"
                    aria-label={label}
                    title={label}
                    aria-pressed={appearance === value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'grid size-8 press place-items-center rounded-full',
                        appearance === value
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <Icon
                        className="size-[15px]"
                        strokeWidth={1.8}
                        aria-hidden
                    />
                </button>
            ))}
        </div>
    );
}

function SidebarLink({
    item,
    active,
    collapsed,
}: {
    item: ShellNavItem;
    active: boolean;
    collapsed: boolean;
}) {
    const count = item.count ?? 0;
    const Icon = item.icon;
    const label = count > 99 ? '99+' : count;

    return (
        <li>
            <Link
                href={item.href}
                prefetch
                title={collapsed ? item.title : undefined}
                aria-label={collapsed ? item.title : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'relative flex h-10 press items-center gap-2.5 rounded-md text-sm',
                    collapsed ? 'justify-center' : 'px-3',
                    active
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : 'font-medium text-sidebar-foreground hover:bg-muted',
                )}
            >
                <span className="relative shrink-0">
                    <Icon
                        className="size-[18px]"
                        strokeWidth={1.8}
                        aria-hidden
                    />
                    {collapsed && count > 0 && (
                        <span
                            aria-hidden
                            className="absolute -top-1 -right-1 size-2 rounded-full bg-brand ring-2 ring-sidebar"
                        />
                    )}
                </span>
                {!collapsed && (
                    <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {count > 0 &&
                            (item.alert ? (
                                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">
                                    {label}
                                    <span className="sr-only"> menunggu</span>
                                </span>
                            ) : (
                                <span
                                    className={cn(
                                        'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold',
                                        active
                                            ? 'bg-brand text-brand-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {label}
                                </span>
                            ))}
                    </>
                )}
            </Link>
        </li>
    );
}

/**
 * Sidebar desktop mengikuti MyWahana (layouts/responsive-layout.tsx): logo +
 * subjudul + tag peran, menu berikon, baris tema · notifikasi · ciutkan, lalu
 * chip site & peran + kartu pengguna. Bisa diciutkan jadi rel ikon 72px.
 */
export function ShellSidebar() {
    const { groups, isActive, user, roleLabel, homeHref, isManager, siteName } =
        useShellNavigation();
    const getInitials = useInitials();
    const [collapsed, setCollapsed] = useState(readCollapsed);

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--shell-left',
            collapsed ? '72px' : '264px',
        );
    }, [collapsed]);

    const toggle = () => {
        const next = !collapsed;

        setCollapsed(next);

        try {
            localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
        } catch {
            // penyimpanan diblokir: pilihan hanya berlaku di halaman ini
        }
    };

    const collapseButton = (
        <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            className="grid size-9 press place-items-center rounded-full hover:bg-muted"
        >
            <PanelLeft className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
    );

    return (
        <aside
            className={cn(
                'sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
                collapsed ? 'w-[72px]' : 'w-[264px]',
            )}
        >
            <div
                className={cn(
                    'pt-5 pb-2',
                    collapsed ? 'flex justify-center px-3' : 'px-3.5',
                )}
            >
                <Link
                    href={homeHref}
                    aria-label="PIMS, beranda"
                    className="flex items-center gap-2.5 rounded-md px-1 py-1"
                >
                    <img
                        src="/images/pims-logo.png"
                        alt=""
                        className="size-8 shrink-0 object-contain"
                    />
                    {!collapsed && (
                        <>
                            <span className="flex min-w-0 flex-col">
                                <span className="text-base leading-tight font-extrabold tracking-[-0.01em]">
                                    PIMS
                                </span>
                                <span className="truncate text-[11px] font-normal text-muted-foreground">
                                    P2H Management
                                </span>
                            </span>
                            {isManager && (
                                <span className="ml-auto rounded-full bg-ink px-[7px] py-[3px] text-[10px] font-bold text-brand uppercase">
                                    {roleLabel}
                                </span>
                            )}
                        </>
                    )}
                </Link>
            </div>

            <nav
                aria-label="Navigasi utama"
                className={cn(
                    'flex-1 overflow-y-auto pb-4 [scrollbar-width:thin]',
                    collapsed ? 'px-3' : 'px-3.5',
                )}
            >
                {groups.map((group, gi) => (
                    <div key={group.label ?? gi}>
                        {group.label &&
                            (collapsed ? (
                                <div
                                    aria-hidden
                                    className="mx-auto my-2.5 h-px w-6 bg-border"
                                />
                            ) : (
                                <p className="px-3 pt-3.5 pb-1 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                                    {group.label}
                                </p>
                            ))}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => (
                                <SidebarLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item)}
                                    collapsed={collapsed}
                                />
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            <div
                className={cn(
                    'flex flex-col gap-3 pt-4 pb-5',
                    collapsed ? 'items-center px-3' : 'px-3.5',
                )}
            >
                <div
                    className={cn(
                        'flex items-center gap-1',
                        collapsed && 'flex-col',
                    )}
                >
                    {!collapsed && <ThemeSwitch />}
                    <NotificationBell side="right" className="size-9" />
                    {collapseButton}
                </div>

                {user && (
                    <div className="w-full">
                        {!collapsed && (
                            <div className="mb-1 flex flex-wrap items-center gap-1.5 px-2 py-1">
                                {siteName && (
                                    <span className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                        {siteName}
                                    </span>
                                )}
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                    {roleLabel}
                                </span>
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={collapsed ? user.name : undefined}
                                className={cn(
                                    'flex w-full press items-center gap-3 rounded-md text-left hover:bg-muted',
                                    collapsed ? 'justify-center p-1' : 'p-2',
                                )}
                            >
                                <span
                                    aria-hidden
                                    className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold"
                                >
                                    {getInitials(user.name)}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {user.name}
                                        </span>
                                        <ChevronsUpDown
                                            className="size-4 shrink-0 opacity-50"
                                            aria-hidden
                                        />
                                    </>
                                )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align="start"
                                className="w-60 rounded-xl"
                            >
                                <UserMenuContent
                                    user={user as unknown as User}
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </aside>
    );
}
