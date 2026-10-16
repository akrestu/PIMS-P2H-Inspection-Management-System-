import type { ReactNode } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/**
 * SideDrawer (desktop, kanan 460–540) / BottomSheet (mobile, vaul) — docs/02.
 * Header (judul + tutup) · body scroll · footer aksi sticky.
 */
export function ResponsiveDrawer({
    open,
    onOpenChange,
    title,
    description,
    footer,
    width = 'md',
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    /** Aksi: Batal (outline) + aksi primer kanan; destruktif di kiri. */
    footer?: ReactNode;
    width?: 'md' | 'lg';
    children: ReactNode;
}) {
    const isDesktop = useIsDesktop();

    if (isDesktop) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className={cn(
                        'w-full gap-0 p-0 shadow-lg sm:max-w-none',
                        width === 'md' ? 'lg:w-[480px]' : 'lg:w-[540px]',
                    )}
                >
                    <div className="flex min-h-16 flex-col justify-center border-b px-6 py-3 pr-14">
                        <SheetTitle className="text-lg font-semibold tracking-[-0.01em]">
                            {title}
                        </SheetTitle>
                        {description ? (
                            <SheetDescription>{description}</SheetDescription>
                        ) : (
                            <SheetDescription className="sr-only">
                                {typeof title === 'string' ? title : 'Detail'}
                            </SheetDescription>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {children}
                    </div>
                    {footer && (
                        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
                            {footer}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                    {description ? (
                        <DrawerDescription>{description}</DrawerDescription>
                    ) : (
                        <DrawerDescription className="sr-only">
                            {typeof title === 'string' ? title : 'Detail'}
                        </DrawerDescription>
                    )}
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                    {children}
                </div>
                {footer && <DrawerFooter>{footer}</DrawerFooter>}
            </DrawerContent>
        </Drawer>
    );
}
