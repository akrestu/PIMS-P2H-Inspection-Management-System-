import { Link } from '@inertiajs/react';
import { Menu, Plus } from 'lucide-react';
import { useState } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { ShellNavItem } from './navigation';
import { useShellNavigation } from './navigation';

function Badge({ item }: { item: ShellNavItem }) {
    const count = item.count ?? 0;

    if (count <= 0) {
        return null;
    }

    return (
        <span
            className={cn(
                'absolute -top-1 left-1/2 ml-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ring-2 ring-background',
                item.alert
                    ? 'bg-danger text-white dark:text-background'
                    : 'bg-foreground text-background',
            )}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

function NavButton({
    item,
    active,
    className,
}: {
    item: ShellNavItem;
    active: boolean;
    className?: string;
}) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
                'relative flex min-h-12 flex-1 press flex-col items-center justify-center gap-1 pt-1.5 text-[11px]',
                active
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
                className,
            )}
        >
            {active && (
                <span
                    aria-hidden
                    className="absolute top-0 h-[3px] w-6 rounded-b-full bg-brand"
                />
            )}
            <span className="relative">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                <Badge item={item} />
            </span>
            <span className="max-w-full truncate px-1">{item.title}</span>
        </Link>
    );
}

/**
 * Bottom nav mobile (docs/02#appshell): tinggi 84 termasuk safe area, 5 item.
 * Driver: tombol tengah kuning 56 "Isi P2H". Manager/Admin: "Lainnya" membuka sheet.
 */
export function ShellBottomNav() {
    const { bottom, more, fill, isActive, isManager } = useShellNavigation();
    const [open, setOpen] = useState(false);
    const moreActive = more.some(isActive);
    const moreAlert = more.some((i) => i.alert && (i.count ?? 0) > 0);

    // Driver: dua item, tombol Isi P2H di tengah, lalu sisanya
    const left = isManager ? bottom : bottom.slice(0, 2);
    const right = isManager ? [] : bottom.slice(2);

    return (
        <>
            <nav
                aria-label="Navigasi utama"
                className="fixed inset-x-0 bottom-0 z-40 border-t pb-[max(env(safe-area-inset-bottom),8px)] blurbar lg:hidden"
            >
                <div className="mx-auto flex h-[68px] max-w-[560px] items-stretch px-2">
                    {left.map((item) => (
                        <NavButton
                            key={item.href}
                            item={item}
                            active={isActive(item)}
                        />
                    ))}

                    {!isManager && (
                        <div className="flex flex-1 items-start justify-center">
                            <Link
                                href={fill.href}
                                aria-label={fill.title}
                                aria-current={
                                    isActive(fill) ? 'page' : undefined
                                }
                                className="-mt-5 grid size-14 press place-items-center rounded-full bg-brand text-brand-foreground shadow-lg ring-4 ring-background"
                            >
                                <Plus className="size-7" strokeWidth={2.25} />
                            </Link>
                        </div>
                    )}

                    {right.map((item) => (
                        <NavButton
                            key={item.href}
                            item={item}
                            active={isActive(item)}
                        />
                    ))}

                    {more.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            aria-haspopup="dialog"
                            className={cn(
                                'relative flex min-h-12 flex-1 press flex-col items-center justify-center gap-1 pt-1.5 text-[11px]',
                                moreActive
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {moreActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-0 h-[3px] w-6 rounded-b-full bg-brand"
                                />
                            )}
                            <span className="relative">
                                <Menu
                                    className="size-6"
                                    strokeWidth={1.75}
                                    aria-hidden
                                />
                                {moreAlert && (
                                    <span
                                        aria-hidden
                                        className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger ring-2 ring-background"
                                    />
                                )}
                            </span>
                            Lainnya
                        </button>
                    )}
                </div>
            </nav>

            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Menu lainnya</DrawerTitle>
                        <DrawerDescription className="sr-only">
                            Laporan, data master, dan pengaturan
                        </DrawerDescription>
                    </DrawerHeader>
                    <ul className="grid grid-cols-3 gap-2 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
                        {more.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item);

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'relative flex min-h-[88px] press flex-col items-center justify-center gap-2 rounded-xl border-(length:--bw) p-2 text-center text-[13px] leading-tight',
                                            active
                                                ? 'border-foreground bg-brand-soft font-semibold'
                                                : 'bg-card hover:bg-muted',
                                        )}
                                    >
                                        <span className="relative">
                                            <Icon
                                                className="size-6"
                                                strokeWidth={1.75}
                                                aria-hidden
                                            />
                                            <Badge item={item} />
                                        </span>
                                        {item.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </DrawerContent>
            </Drawer>
        </>
    );
}
