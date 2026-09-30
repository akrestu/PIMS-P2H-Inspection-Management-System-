import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Nomor halaman dengan elipsis: 1 … 4 5 6 … 20 */
function pageList(current: number, last: number): (number | 'gap')[] {
    const pages: (number | 'gap')[] = [];

    for (let p = 1; p <= last; p++) {
        if (p === 1 || p === last || Math.abs(p - current) <= 1) {
            if (pages.length > 0 && pages[pages.length - 1] !== p - 1) {
                pages.push('gap');
            }

            pages.push(p);
        }
    }

    return pages;
}

/**
 * Tombol navigasi halaman. Di HP: ‹ 3 / 10 › dengan target sentuh 44px;
 * di layar lebar: nomor halaman lengkap. Semua tombol berlabel untuk pembaca layar.
 */
export function PageButtons({
    currentPage,
    lastPage,
    onPageChange,
}: {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
}) {
    if (lastPage <= 1) {
        return null;
    }

    const navClass = 'h-11 w-11 p-0 sm:h-8 sm:w-8';

    return (
        <nav aria-label="Navigasi halaman" className="flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                className={navClass}
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Halaman sebelumnya"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="px-2 text-sm tabular-nums sm:hidden">
                {currentPage} / {lastPage}
            </span>

            <div className="hidden items-center gap-1 sm:flex">
                {pageList(currentPage, lastPage).map((p, i) =>
                    p === 'gap' ? (
                        <span
                            key={`gap-${i}`}
                            className="px-1 text-sm text-muted-foreground"
                            aria-hidden
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={p}
                            size="sm"
                            variant={p === currentPage ? 'default' : 'outline'}
                            className="h-8 min-w-8 px-2 text-xs tabular-nums"
                            onClick={() => onPageChange(p)}
                            aria-label={`Halaman ${p}`}
                            aria-current={
                                p === currentPage ? 'page' : undefined
                            }
                        >
                            {p}
                        </Button>
                    ),
                )}
            </div>

            <Button
                variant="outline"
                size="sm"
                className={navClass}
                disabled={currentPage >= lastPage}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Halaman berikutnya"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}

/** Baris pagination standar: "1–20 dari 135 <satuan>" + tombol halaman. */
export function PaginationBar({
    currentPage,
    lastPage,
    from,
    to,
    total,
    unit,
    onPageChange,
    className,
}: {
    currentPage: number;
    lastPage: number;
    from: number | null;
    to: number | null;
    total: number;
    unit: string;
    onPageChange: (page: number) => void;
    className?: string;
}) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-3 sm:flex-row sm:justify-between',
                className,
            )}
        >
            <p className="text-xs text-muted-foreground tabular-nums">
                {from}–{to} dari{' '}
                <span className="font-medium text-foreground">{total}</span>{' '}
                {unit}
            </p>
            <PageButtons
                currentPage={currentPage}
                lastPage={lastPage}
                onPageChange={onPageChange}
            />
        </div>
    );
}
