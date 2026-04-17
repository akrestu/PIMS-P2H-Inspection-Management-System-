import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export interface NavGroup {
    label: string;
    items: (NavItem & { badge?: number | string })[];
    defaultOpen?: boolean;
}

type HrefType = NonNullable<InertiaLinkProps['href']>;

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    // Use exact URL matching to avoid false positives (e.g. /p2h matching /p2h/form)
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            {groups.map((group) => (
                <NavGroup key={group.label} group={group} isActive={isCurrentUrl} />
            ))}
        </>
    );
}

function NavGroup({
    group,
    isActive,
}: {
    group: NavGroup;
    isActive: (href: HrefType) => boolean;
}) {
    const [open, setOpen] = useState(group.defaultOpen ?? true);
    const { isMobile, setOpenMobile } = useSidebar();

    // Close mobile sidebar sheet after navigation
    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
            <SidebarGroup className="py-0">
                {/* Group label — hidden when sidebar is icon-collapsed */}
                <SidebarGroupLabel
                    asChild
                    className="group-data-[collapsible=icon]:hidden h-7 cursor-pointer select-none rounded-md text-xs font-semibold uppercase tracking-widest hover:bg-sidebar-accent/50 transition-colors"
                >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-2">
                        <span>{group.label}</span>
                        <ChevronDown
                            className={`h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform duration-200 ${
                                open ? 'rotate-0' : '-rotate-90'
                            }`}
                        />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={active}
                                        tooltip={{ children: item.title, hidden: false }}
                                        className={`
                                            relative h-9 gap-3 rounded-lg px-3 transition-all duration-150
                                            ${active
                                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm'
                                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                                            }
                                        `}
                                    >
                                        <Link
                                            href={item.href}
                                            prefetch
                                            onClick={handleLinkClick}
                                            className="flex items-center gap-3 w-full"
                                        >
                                            {/* Active indicator bar */}
                                            {active && (
                                                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />
                                            )}
                                            {item.icon && (
                                                <item.icon
                                                    className={`h-4 w-4 flex-shrink-0 transition-colors ${
                                                        active
                                                            ? 'text-sidebar-primary'
                                                            : 'text-sidebar-foreground/50'
                                                    }`}
                                                />
                                            )}
                                            <span className="truncate text-sm">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    {item.badge !== undefined && item.badge !== 0 && (
                                        <SidebarMenuBadge
                                            className={`
                                                text-[10px] font-bold tabular-nums min-w-[18px] h-[18px] px-1
                                                flex items-center justify-center rounded-full
                                                ${typeof item.badge === 'number' && item.badge > 0
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-sidebar-accent text-sidebar-foreground'
                                                }
                                            `}
                                        >
                                            {typeof item.badge === 'number' && item.badge > 99
                                                ? '99+'
                                                : item.badge}
                                        </SidebarMenuBadge>
                                    )}
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}
