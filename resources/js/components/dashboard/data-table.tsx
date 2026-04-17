import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

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
            <span className="font-semibold tracking-wide">{row.getValue('no_unit')}</span>
        ),
    },
    {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">{row.getValue('tanggal')}</span>
        ),
    },
    {
        accessorKey: 'driver',
        header: 'Driver',
        cell: ({ row }) =>
            row.getValue('driver') ? (
                <span className="text-sm">{row.getValue('driver')}</span>
            ) : (
                <span className="text-muted-foreground/50 text-sm">—</span>
            ),
    },
    {
        accessorKey: 'slot_terisi',
        header: 'Slot',
        cell: ({ row }) => {
            const val = row.getValue<number>('slot_terisi');
            return (
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((s) => (
                        <span
                            key={s}
                            className={`h-2 w-2 rounded-full ${s <= val ? 'bg-blue-500' : 'bg-border'}`}
                        />
                    ))}
                    <span className="text-muted-foreground ml-1 text-xs">{val}/4</span>
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
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400 font-medium">
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
                    className={status === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                    {STATUS_LABELS[status] ?? status}
                </Badge>
            );
        },
    },
];

export function DataTable({ data }: { data: RecentP2h[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<FilterTab>('semua');

    const filtered = useMemo(() => {
        let rows = data;
        if (tab === 'selesai') rows = rows.filter((r) => r.status === 'completed');
        else if (tab === 'open') rows = rows.filter((r) => r.status !== 'completed');
        else if (tab === 'ada_tl') rows = rows.filter((r) => r.total_tl > 0);

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

    const counts = useMemo(() => ({
        semua: data.length,
        selesai: data.filter((r) => r.status === 'completed').length,
        open: data.filter((r) => r.status !== 'completed').length,
        ada_tl: data.filter((r) => r.total_tl > 0).length,
    }), [data]);

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
        <Card className="border-border/60 mx-4 lg:mx-6">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-0.5">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="text-muted-foreground h-4 w-4" />
                            P2H Terbaru
                        </CardTitle>
                        <CardDescription>Daftar sesi P2H yang baru terdaftar</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-56">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                        <Input
                            placeholder="Cari unit atau driver..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
                    <TabsList className="h-8">
                        <TabsTrigger value="semua" className="text-xs px-3">
                            Semua
                            <span className="bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                {counts.semua}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="selesai" className="text-xs px-3">
                            Selesai
                            <span className="bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                {counts.selesai}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="open" className="text-xs px-3">
                            Open
                            <span className="bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                {counts.open}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="ada_tl" className="text-xs px-3">
                            Ada TL
                            {counts.ada_tl > 0 && (
                                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                    {counts.ada_tl}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id} className="hover:bg-transparent border-b">
                                {hg.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="text-muted-foreground h-9 text-xs font-medium uppercase tracking-wide"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                                    onClick={() => (window.location.href = `/p2h/${row.original.id}`)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="text-muted-foreground py-12 text-center text-sm"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <ClipboardList className="text-muted-foreground/40 h-8 w-8" />
                                        <span>Tidak ada data P2H yang cocok</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {table.getPageCount() > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                        <span className="text-muted-foreground text-xs">
                            Menampilkan {table.getRowModel().rows.length} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">
                                Hal. {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
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
