import type {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
} from '@tanstack/react-table';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChipOption } from '@/components/pims/filter-chips';
import { FilterChips } from '@/components/pims/filter-chips';
import { SortableHead } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface RecentP2h {
    id: number;
    no_unit: string;
    tanggal: string;
    driver: string | null;
    total_tl: number;
    status: string;
    slot_terisi: number;
}

type FilterTab = 'semua' | 'selesai' | 'open' | 'ada_tl';

const STATUS_LABELS: Record<string, string> = {
    completed: 'Selesai',
    open: 'Open',
};

const columns: ColumnDef<RecentP2h>[] = [
    {
        accessorKey: 'no_unit',
        header: 'No. Unit',
        cell: ({ row }) => (
            <span className="font-semibold tracking-wide">
                {row.getValue('no_unit')}
            </span>
        ),
    },
    {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.getValue('tanggal')}
            </span>
        ),
    },
    {
        accessorKey: 'driver',
        header: 'Driver',
        cell: ({ row }) =>
            row.getValue('driver') ? (
                <span className="text-sm">{row.getValue('driver')}</span>
            ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
            ),
    },
    {
        accessorKey: 'slot_terisi',
        header: 'Slot',
        cell: ({ row }) => {
            const val = row.getValue<number>('slot_terisi');

            return (
                <div className="flex items-center gap-1">
                    {Array.from({ length: val }).map((_, i) => (
                        <span
                            key={i}
                            className="h-2 w-2 rounded-full bg-info"
                        />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">
                        {val}x
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: 'total_tl',
        header: 'Item TL',
        cell: ({ row }) => {
            const val = row.getValue<number>('total_tl');

            return val > 0 ? (
                <Badge variant="destructive" className="font-bold">
                    {val} TL
                </Badge>
            ) : (
                <Badge
                    variant="outline"
                    className="border-success/40 font-medium text-success"
                >
                    Layak
                </Badge>
            );
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue<string>('status');

            return (
                <Badge
                    variant={status === 'completed' ? 'default' : 'secondary'}
                    className={
                        status === 'completed'
                            ? 'bg-success hover:bg-success'
                            : ''
                    }
                >
                    {STATUS_LABELS[status] ?? status}
                </Badge>
            );
        },
    },
];

export function DataTable({ data }: { data: RecentP2h[] }) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'no_unit', desc: false },
    ]);
    const sortState = {
        by: sorting[0]?.id ?? '',
        dir: sorting[0]?.desc ? ('desc' as const) : ('asc' as const),
    };
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        {},
    );
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<FilterTab>('semua');

    const filtered = useMemo(() => {
        let rows = data;

        if (tab === 'selesai') {
            rows = rows.filter((r) => r.status === 'completed');
        } else if (tab === 'open') {
            rows = rows.filter((r) => r.status !== 'completed');
        } else if (tab === 'ada_tl') {
            rows = rows.filter((r) => r.total_tl > 0);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(
                (r) =>
                    r.no_unit.toLowerCase().includes(q) ||
                    (r.driver ?? '').toLowerCase().includes(q) ||
                    r.tanggal.includes(q),
            );
        }

        return rows;
    }, [data, tab, search]);

    const counts = useMemo(
        () => ({
            semua: data.length,
            selesai: data.filter((r) => r.status === 'completed').length,
            open: data.filter((r) => r.status !== 'completed').length,
            ada_tl: data.filter((r) => r.total_tl > 0).length,
        }),
        [data],
    );

    // TanStack Table exposes non-memoizable callbacks; React Compiler safely skips this hook.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filtered,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: { pagination: { pageSize: 8 } },
        state: { sorting, columnFilters, columnVisibility },
    });

    return (
        <Card className="mx-4 border-border/60 lg:mx-6">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-0.5">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            P2H Terbaru
                        </CardTitle>
                        <CardDescription>
                            Daftar sesi P2H yang baru terdaftar
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari unit atau driver..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 text-sm lg:h-8"
                        />
                    </div>
                </div>

                <FilterChips
                    label="Filter P2H terbaru"
                    value={tab}
                    onChange={(v) => setTab(v)}
                    options={
                        [
                            {
                                value: 'semua',
                                label: 'Semua',
                                count: counts.semua,
                            },
                            {
                                value: 'selesai',
                                label: 'Selesai',
                                count: counts.selesai,
                            },
                            {
                                value: 'open',
                                label: 'Open',
                                count: counts.open,
                            },
                            {
                                value: 'ada_tl',
                                label: 'Ada TL',
                                count: counts.ada_tl,
                            },
                        ] satisfies ChipOption<FilterTab>[]
                    }
                />
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow
                                key={hg.id}
                                className="border-b hover:bg-transparent"
                            >
                                {hg.headers.map((header) => {
                                    const className =
                                        'h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase';
                                    const label = header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          );

                                    return header.column.getCanSort() ? (
                                        <SortableHead
                                            key={header.id}
                                            column={header.column.id}
                                            sort={sortState}
                                            onSort={() =>
                                                header.column.toggleSorting(
                                                    sortState.by ===
                                                        header.column.id &&
                                                        sortState.dir === 'asc',
                                                )
                                            }
                                            className={className}
                                        >
                                            {label}
                                        </SortableHead>
                                    ) : (
                                        <TableHead
                                            key={header.id}
                                            className={className}
                                        >
                                            {label}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer transition-colors hover:bg-muted/40"
                                    onClick={() =>
                                        (window.location.href = `/p2h/${row.original.id}`)
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="py-3"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="py-12 text-center text-sm text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                                        <span>
                                            Tidak ada data P2H yang cocok
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {table.getPageCount() > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                            Menampilkan {table.getRowModel().rows.length} dari{' '}
                            {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                                Hal. {table.getState().pagination.pageIndex + 1}
                                /{table.getPageCount()}
                            </span>
                            <Button
                                aria-label="Halaman sebelumnya"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                aria-label="Halaman berikutnya"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
