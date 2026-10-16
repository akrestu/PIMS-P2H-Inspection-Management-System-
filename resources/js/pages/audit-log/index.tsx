import { Head, router } from '@inertiajs/react';
import { ClipboardList, Search, Shield, Trash2, User } from 'lucide-react';
import { useRef } from 'react';
import { PageButtons } from '@/components/pagination-bar';
import { SortableHead } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface LogEntry {
    id: number;
    log_name: 'user' | 'unit' | 'p2h' | string;
    description: string;
    causer_name: string;
    causer_role: string;
    properties: Record<string, unknown>;
    created_at: string;
}

interface PaginatedLogs {
    data: LogEntry[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    logs: PaginatedLogs;
    filters: {
        log_name?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

const LOG_BADGE: Record<
    string,
    { label: string; className: string; icon: React.ElementType }
> = {
    user: {
        label: 'User',
        className: 'border-info/40 bg-info-soft text-info   ',
        icon: User,
    },
    unit: {
        label: 'Unit',
        className: 'border-success/40 bg-success-soft text-success   ',
        icon: Shield,
    },
    p2h: {
        label: 'P2H',
        className: 'border-warning/40 bg-warning-soft text-warning   ',
        icon: Trash2,
    },
};

export default function AuditLogIndex({ logs, filters }: Props) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilter = (patch: Partial<typeof filters>) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.get(
                '/audit-log',
                { ...filters, ...patch, page: 1 },
                { preserveState: true, replace: true },
            );
        }, 350);
    };

    const goToPage = (page: number) => {
        router.get('/audit-log', { ...filters, page }, { preserveState: true });
    };

    return (
        <>
            <Head title="Audit Log" />
            <div className="flex flex-col gap-6 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                        Audit Log
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Riwayat semua aksi penting yang dilakukan di sistem
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="h-4 w-4" />
                            Filter Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    defaultValue={filters.search}
                                    onChange={(e) =>
                                        applyFilter({
                                            search: e.target.value || undefined,
                                        })
                                    }
                                    placeholder="Cari deskripsi…"
                                    className="h-9 pl-9"
                                />
                            </div>

                            <Select
                                value={filters.log_name ?? 'all'}
                                onValueChange={(v) =>
                                    applyFilter({
                                        log_name: v === 'all' ? undefined : v,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Semua kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua kategori
                                    </SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="unit">Unit</SelectItem>
                                    <SelectItem value="p2h">P2H</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                type="date"
                                defaultValue={filters.date_from}
                                onChange={(e) =>
                                    applyFilter({
                                        date_from: e.target.value || undefined,
                                    })
                                }
                                className="h-9"
                            />
                            <Input
                                type="date"
                                defaultValue={filters.date_to}
                                onChange={(e) =>
                                    applyFilter({
                                        date_to: e.target.value || undefined,
                                    })
                                }
                                className="h-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <SortableHead
                                            column="created_at"
                                            descFirst
                                            className="w-32"
                                        >
                                            Waktu
                                        </SortableHead>
                                        <SortableHead
                                            column="log_name"
                                            className="w-20"
                                        >
                                            Kategori
                                        </SortableHead>
                                        <SortableHead column="description">
                                            Deskripsi
                                        </SortableHead>
                                        <SortableHead
                                            column="causer"
                                            className="w-40"
                                        >
                                            Dilakukan oleh
                                        </SortableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="py-12 text-center text-sm text-muted-foreground"
                                            >
                                                Tidak ada log yang cocok dengan
                                                filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.data.map((log) => {
                                            const badge = LOG_BADGE[
                                                log.log_name
                                            ] ?? {
                                                label: log.log_name,
                                                className:
                                                    'border-muted bg-muted/50 text-muted-foreground',
                                                icon: ClipboardList,
                                            };
                                            const Icon = badge.icon;

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                                        {log.created_at}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`gap-1 text-xs ${badge.className}`}
                                                        >
                                                            <Icon className="h-3 w-3" />
                                                            {badge.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {log.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">
                                                            {log.causer_name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground capitalize">
                                                            {log.causer_role}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {logs.from}–{logs.to} dari {logs.total} log
                                </p>
                                <PageButtons
                                    currentPage={logs.current_page}
                                    lastPage={logs.last_page}
                                    onPageChange={goToPage}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AuditLogIndex.layout = {
    breadcrumbs: [{ title: 'Audit Log', href: '/audit-log' }],
};
