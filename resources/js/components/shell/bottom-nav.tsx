import { Link } from '@inertiajs/react';
import { Menu, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
        <span className="absolute -top-1.5 left-1/2 ml-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {count > 99 ? '99+' : count}
        </span>
    );
}

const navItemClass = (active: boolean) =>
    cn(
        'relative flex min-h-12 flex-1 press flex-col items-center justify-center gap-1 text-[11px]',
        active ? 'font-bold text-foreground' : 'text-muted-foreground',
    );

function NavButton({ item, active }: { item: ShellNavItem; active: boolean }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={navItemClass(active)}
        >
            <span className="relative">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                <Badge item={item} />
            </span>
            <span className="max-w-full truncate px-1">{item.title}</span>
        </Link>
    );
}

/**
 * MWBottomNav (docs/02#appshell, docs/13#3): bar kaca melayang, tombol + tengah
 * membuka menu "AKSI CEPAT". "Lainnya" membuka sheet menu lengkap.
 */
export function ShellBottomNav() {
    const { bottom, more, quickActions, isActive } = useShellNavigation();
    const [moreOpen, setMoreOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const fabRef = useRef<HTMLButtonElement>(null);
    const moreActive = more.some(isActive);
    const moreAlert = more.some((i) => i.alert && (i.count ?? 0) > 0);

    // Dua item di kiri tombol +, sisanya di kanan
    const left = bottom.slice(0, 2);
    const right = bottom.slice(2);

    useEffect(() => {
        if (!quickOpen) {
            return;
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setQuickOpen(false);
                fabRef.current?.focus();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [quickOpen]);

    return (
        <>
            {quickOpen && (
                <div className="lg:hidden">
                    <button
                        type="button"
                        aria-label="Tutup aksi cepat"
                        tabIndex={-1}
                        onClick={() => setQuickOpen(false)}
                        className="fixed inset-0 z-40 animate-fade bg-scrim"
                    />
                    <div
                        id="aksi-cepat"
                        className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),12px)+84px)] z-50 mx-auto max-w-[536px] animate-fade-up rounded-2xl bg-card p-3 shadow-lg"
                    >
                        <p className="px-3 pt-1 pb-2 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                            Aksi cepat
                        </p>
                        <ul>
                            {quickActions.map((action, i) => {
                                const Icon = action.icon;

                                return (
                                    <li key={action.href}>
                                        <Link
                                            href={action.href}
                                            autoFocus={i === 0}
                                            onClick={() => setQuickOpen(false)}
                                            className="flex min-h-14 press items-center gap-3 rounded-md px-3 text-[15px] font-semibold hover:bg-muted"
                                        >
                                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                                                <Icon
                                                    className="size-5"
                                                    strokeWidth={1.75}
                                                    aria-hidden
                                                />
                                            </span>
                                            {action.title}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}

            <nav
                aria-label="Navigasi utama"
                className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-50 mx-auto max-w-[536px] rounded-2xl shadow-lg blurbar lg:hidden"
            >
                <div className="flex h-[72px] items-stretch px-1">
                    {left.map((item) => (
                        <NavButton
                            key={item.href}
                            item={item}
                            active={isActive(item)}
                        />
                    ))}

                    <div className="flex flex-1 items-start justify-center">
                        <button
                            ref={fabRef}
                            type="button"
                            aria-label={
                                quickOpen ? 'Tutup aksi cepat' : 'Aksi cepat'
                            }
                            aria-expanded={quickOpen}
                            aria-controls="aksi-cepat"
                            onClick={() => setQuickOpen((v) => !v)}
                            className="-mt-5 grid size-14 press place-items-center rounded-full bg-ink text-brand shadow-lg ring-4 ring-background dark:bg-brand dark:text-brand-foreground"
                        >
                            {quickOpen ? (
                                <X className="size-6" aria-hidden />
                            ) : (
                                <Plus
                                    className="size-7"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            )}
                        </button>
                    </div>

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
                            onClick={() => setMoreOpen(true)}
                            aria-haspopup="dialog"
                            className={navItemClass(moreActive)}
                        >
                            <span className="relative">
                                <Menu
                                    className="size-6"
                                    strokeWidth={1.75}
                                    aria-hidden
                                />
                                {moreAlert && (
                                    <span
                                        aria-hidden
                                        className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand"
                                    />
                                )}
                            </span>
                            Lainnya
                        </button>
                    )}
                </div>
            </nav>

            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
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
                                        onClick={() => setMoreOpen(false)}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'relative flex min-h-[88px] press flex-col items-center justify-center gap-2 rounded-xl p-2 text-center text-[13px] leading-tight',
                                            active
                                                ? 'bg-ink font-semibold text-ink-foreground'
                                                : 'bg-muted-2 hover:bg-muted',
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
