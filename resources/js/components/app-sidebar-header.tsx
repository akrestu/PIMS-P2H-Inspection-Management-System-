import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { notifications } = usePage<{
        notifications: { unread_count: number };
    }>().props;

    const unreadCount = notifications?.unread_count ?? 0;

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            {/* Left: trigger + breadcrumbs */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* Sidebar toggle — desktop only; mobile uses bottom nav bar */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SidebarTrigger className="-ml-1 hidden h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:flex" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Toggle sidebar{' '}
                            <kbd className="ml-1 rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[10px]">
                                ⌘B
                            </kbd>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {breadcrumbs.length > 0 && (
                    <>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="min-w-0 truncate">
                            <Breadcrumbs breadcrumbs={breadcrumbs} />
                        </div>
                    </>
                )}
            </div>

            {/* Right: theme toggle + notification bell */}
            <div className="flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ThemeToggle variant="ghost" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Ganti tema
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                asChild
                            >
                                <Link href="/notifications">
                                    <Bell className="h-4 w-4" />
                                    {unreadCount > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[9px] font-bold leading-none"
                                        >
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </Badge>
                                    )}
                                    <span className="sr-only">Notifikasi</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            {unreadCount > 0
                                ? `${unreadCount} notifikasi belum dibaca`
                                : 'Notifikasi'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </header>
    );
}
