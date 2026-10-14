import { router, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDir = 'asc' | 'desc';
export type SortState = { by: string; dir: SortDir };

type SortableHeadProps = Omit<React.ComponentProps<'th'>, 'onClick'> & {
    column: string;
    /** Mode client: state & handler dari useClientSort. Tanpa ini → mode server. */
    sort?: SortState;
    onSort?: (column: string, descFirst?: boolean) => void;
    /** Kolom angka/tanggal: klik pertama langsung urut menurun */
    descFirst?: boolean;
    /** Render sebagai <th> biasa (untuk tabel yang tidak memakai ui/table) */
    plain?: boolean;
};

/** Parameter sort aktif di URL, untuk dibawa saat filter/pencarian berubah */
export function sortParams(): { sort?: string; dir?: string } {
    if (typeof window === 'undefined') {
        return {};
    }

    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    const dir = params.get('dir');

    return sort ? { sort, dir: dir ?? 'asc' } : {};
}

function nextDir(
    current: SortState,
    column: string,
    descFirst: boolean,
): SortDir {
    if (current.by === column) {
        return current.dir === 'asc' ? 'desc' : 'asc';
    }

    return descFirst ? 'desc' : 'asc';
}

/**
 * Header kolom yang bisa diklik untuk mengurutkan tabel.
 * Mode server membaca prop `sort` dari halaman Inertia (lihat trait SortsTable)
 * dan mengirim ulang query string dengan `sort` & `dir`.
 */
export function SortableHead({
    column,
    sort,
    onSort,
    descFirst = false,
    plain = false,
    className,
    children,
    ...props
}: SortableHeadProps) {
    const page = usePage<{ sort?: SortState }>();
    const state = sort ?? page.props.sort ?? { by: '', dir: 'asc' };
    const active = state.by === column;

    const handleClick = () => {
        if (onSort) {
            onSort(column, descFirst);

            return;
        }

        const url = new URL(page.url, window.location.origin);
        const params = Object.fromEntries(url.searchParams.entries());
        delete params.page;

        router.get(
            url.pathname,
            {
                ...params,
                sort: column,
                dir: nextDir(state, column, descFirst),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const Icon = !active
        ? ArrowUpDown
        : state.dir === 'asc'
          ? ArrowUp
          : ArrowDown;
    const Cell = plain ? 'th' : TableHead;

    return (
        <Cell
            aria-sort={
                active
                    ? state.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : 'none'
            }
            className={className}
            {...props}
        >
            <button
                type="button"
                onClick={handleClick}
                className={cn(
                    '-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 whitespace-nowrap transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active && 'text-foreground',
                )}
            >
                {children}
                <Icon
                    aria-hidden
                    className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        active ? 'opacity-100' : 'opacity-40',
                    )}
                />
            </button>
        </Cell>
    );
}

type Accessor<T> = (row: T) => string | number | null | undefined;

const collator = new Intl.Collator('id', {
    numeric: true,
    sensitivity: 'base',
});

/**
 * Sorting di sisi client untuk tabel tanpa paginasi server.
 * Nilai kosong selalu diletakkan di akhir.
 */
export function useClientSort<T>(
    rows: T[],
    accessors: Record<string, Accessor<T>>,
    initial: SortState,
) {
    const [sort, setSort] = useState<SortState>(initial);

    const sorted = useMemo(() => {
        const get = accessors[sort.by];

        if (!get) {
            return rows;
        }

        const factor = sort.dir === 'asc' ? 1 : -1;

        return [...rows].sort((a, b) => {
            const va = get(a);
            const vb = get(b);
            const emptyA = va === null || va === undefined || va === '';
            const emptyB = vb === null || vb === undefined || vb === '';

            if (emptyA || emptyB) {
                return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
            }

            if (typeof va === 'number' && typeof vb === 'number') {
                return (va - vb) * factor;
            }

            return collator.compare(String(va), String(vb)) * factor;
        });
        // accessors biasanya didefinisikan inline; cukup bergantung pada data & state
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, sort]);

    const onSort = (column: string, descFirst = false) =>
        setSort((current) => ({
            by: column,
            dir: nextDir(current, column, descFirst),
        }));

    return { rows: sorted, sort, onSort };
}
