import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn, toUrl } from '@/lib/utils';
import { logout } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    { title: 'Profil', href: edit(), icon: null },
    { title: 'Keamanan', href: editSecurity(), icon: null },
    { title: 'Tampilan', href: editAppearance(), icon: null },
];

const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    driver: 'Driver',
};

/**
 * Akun saya (design/screens/Akun-Desktop.png): header avatar 56 + nama +
 * "Peran · jabatan · email", navigasi seksi kiri, isi dalam kartu.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const getInitials = useInitials();
    const { auth } = usePage<{
        auth: {
            user: {
                name: string;
                email: string | null;
                jabatan: string | null;
                roles: string[];
            } | null;
        };
    }>().props;
    const user = auth.user;
    const meta = [
        ROLE_LABEL[user?.roles?.[0] ?? ''] ?? 'Pengguna',
        user?.jabatan,
        user?.email,
    ].filter(Boolean);

    return (
        <div className="px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
            <header className="flex items-center gap-4">
                <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-muted text-lg font-semibold"
                >
                    {getInitials(user?.name ?? '')}
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-[24px] leading-tight font-semibold tracking-[-0.02em] lg:text-[28px]">
                        {user?.name ?? 'Akun'}
                    </h1>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {meta.join(' · ')}
                    </p>
                </div>
            </header>

            <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,720px)]">
                <nav aria-label="Menu akun" className="noscroll -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
                    {sidebarNavItems.map((item, index) => {
                        const active = isCurrentOrParentUrl(item.href);

                        return (
                            <Link
                                key={`${toUrl(item.href)}-${index}`}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'block rounded-[8px] px-3 py-2 text-sm whitespace-nowrap',
                                    active
                                        ? 'bg-muted font-semibold text-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="min-w-0 space-y-5">
                    <section className="space-y-10 rounded-[14px] border-(length:--bw) bg-card p-5 lg:p-6">
                        {children}
                    </section>

                    <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-muted-foreground">
                            PIMS v1.0
                        </span>
                        <Button
                            variant="outline"
                            className="lg:hidden"
                            onClick={() => router.post(logout.url())}
                        >
                            <LogOut />
                            Keluar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
