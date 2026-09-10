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
                <NavGroup
                    key={group.label}
                    group={group}
                    isActive={isCurrentUrl}
                />
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
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="group/collapsible"
        >
            <SidebarGroup className="py-0">
                {/* Group label — hidden when sidebar is icon-collapsed */}
                <SidebarGroupLabel
                    asChild
                    className="h-7 cursor-pointer rounded-md text-xs font-semibold tracking-widest uppercase transition-colors select-none group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent/50"
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
                                        tooltip={{
                                            children: item.title,
                                            hidden: false,
                                        }}
                                        className={`relative h-9 gap-3 rounded-lg px-3 transition-all duration-150 ${
                                            active
                                                ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm'
                                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                                        } `}
                                    >
                                        <Link
                                            href={item.href}
                                            prefetch
                                            onClick={handleLinkClick}
                                            className="flex w-full items-center gap-3"
                                        >
                                            {/* Active indicator bar */}
                                            {active && (
                                                <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />
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
                                            <span className="truncate text-sm">
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                    {item.badge !== undefined &&
                                        item.badge !== 0 && (
                                            <SidebarMenuBadge
                                                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                                                    typeof item.badge ===
                                                        'number' &&
                                                    item.badge > 0
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-sidebar-accent text-sidebar-foreground'
                                                } `}
                                            >
                                                {typeof item.badge ===
                                                    'number' && item.badge > 99
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
