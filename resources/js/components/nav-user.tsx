import { usePage } from '@inertiajs/react';
import { ChevronsUpDown, Shield, Truck, User2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    admin: {
        label: 'Admin',
        icon: Shield,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    manager: {
        label: 'Manager',
        icon: User2,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    },
    driver: {
        label: 'Driver',
        icon: Truck,
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    },
};

export function NavUser() {
    const { auth } = usePage<{ auth: { user: { roles?: string[] } | null } }>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (!auth.user) return null;

    const roles: string[] = (auth.user as { roles?: string[] }).roles ?? [];
    const primaryRole = roles[0] ?? null;
    const roleConfig = primaryRole ? ROLE_CONFIG[primaryRole] : null;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group h-12 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/30 px-3 hover:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent transition-colors"
                        >
                            <UserInfo user={auth.user as Parameters<typeof UserInfo>[0]['user']} />

                            {/* Role chip — visible only when expanded */}
                            {roleConfig && (
                                <span
                                    className={`
                                        hidden items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                                        group-data-[collapsible=icon]:!hidden
                                        sm:flex
                                        ${roleConfig.color}
                                    `}
                                >
                                    <roleConfig.icon className="h-2.5 w-2.5" />
                                    {roleConfig.label}
                                </span>
                            )}

                            <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl shadow-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'right' : 'bottom'}
                        sideOffset={6}
                    >
                        {/* Role header in dropdown */}
                        {roleConfig && (
                            <div className="flex items-center gap-1.5 px-3 py-2 mb-1">
                                <span
                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${roleConfig.color}`}
                                >
                                    <roleConfig.icon className="h-3 w-3" />
                                    {roleConfig.label}
                                </span>
                            </div>
                        )}
                        <UserMenuContent user={auth.user as Parameters<typeof UserMenuContent>[0]['user']} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
