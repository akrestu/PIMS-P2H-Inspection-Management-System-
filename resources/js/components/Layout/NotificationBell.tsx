import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';

interface SharedProps {
    auth: {
        user: {
            roles: string[];
        } | null;
    };
    notifications: {
        unread_count: number;
    };
}

export default function NotificationBell() {
    const { notifications } = usePage<{ notifications: SharedProps['notifications'] }>().props;
    const unreadCount = notifications?.unread_count ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifikasi</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 font-semibold text-sm">
                    Notifikasi
                    {unreadCount > 0 && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900 dark:text-red-200">
                            {unreadCount} belum dibaca
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator />
                {unreadCount === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Tidak ada notifikasi baru
                    </div>
                ) : (
                    <DropdownMenuItem asChild>
                        <Link href="/notifications" className="w-full cursor-pointer">
                            Lihat semua notifikasi ({unreadCount})
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/notifications" className="w-full cursor-pointer text-xs text-muted-foreground">
                        Kelola notifikasi
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
