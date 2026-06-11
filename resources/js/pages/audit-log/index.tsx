import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ClipboardList, Search, Shield, Trash2, User } from 'lucide-react';
import { useRef } from 'react';

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
    filters: { log_name?: string; search?: string; date_from?: string; date_to?: string };
}

const LOG_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    user: { label: 'User',  className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400',  icon: User },
    unit: { label: 'Unit',  className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', icon: Shield },
    p2h:  { label: 'P2H',   className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400',  icon: Trash2 },
};

export default function AuditLogIndex({ logs, filters }: Props) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilter = (patch: Partial<typeof filters>) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/audit-log', { ...filters, ...patch, page: 1 }, { preserveState: true, replace: true });
        }, 350);
    };

    const goToPage = (page: number) => {
        router.get('/audit-log', { ...filters, page }, { preserveState: true });
    };

    return (
        <>
            <Head title="Audit Log" />
            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">
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
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    defaultValue={filters.search}
                                    onChange={(e) => applyFilter({ search: e.target.value || undefined })}
                                    placeholder="Cari deskripsi…"
                                    className="h-9 pl-9"
                                />
                            </div>

                            <Select
                                value={filters.log_name ?? 'all'}
                                onValueChange={(v) => applyFilter({ log_name: v === 'all' ? undefined : v })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Semua kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua kategori</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="unit">Unit</SelectItem>
                                    <SelectItem value="p2h">P2H</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                type="date"
                                defaultValue={filters.date_from}
                                onChange={(e) => applyFilter({ date_from: e.target.value || undefined })}
                                className="h-9"
                            />
                            <Input
                                type="date"
                                defaultValue={filters.date_to}
                                onChange={(e) => applyFilter({ date_to: e.target.value || undefined })}
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
                                        <TableHead className="w-32">Waktu</TableHead>
                                        <TableHead className="w-20">Kategori</TableHead>
                                        <TableHead>Deskripsi</TableHead>
                                        <TableHead className="w-40">Dilakukan oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                                                Tidak ada log yang cocok dengan filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.data.map((log) => {
                                            const badge = LOG_BADGE[log.log_name] ?? {
                                                label: log.log_name,
                                                className: 'border-muted bg-muted/50 text-muted-foreground',
                                                icon: ClipboardList,
                                            };
                                            const Icon = badge.icon;
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {log.created_at}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`gap-1 text-xs ${badge.className}`}>
                                                            <Icon className="h-3 w-3" />
                                                            {badge.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{log.description}</TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">{log.causer_name}</div>
                                                        <div className="text-xs text-muted-foreground capitalize">{log.causer_role}</div>
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
                                <p className="text-muted-foreground text-xs">
                                    {logs.from}–{logs.to} dari {logs.total} log
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm" variant="outline"
                                        disabled={logs.current_page === 1}
                                        onClick={() => goToPage(logs.current_page - 1)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs tabular-nums px-2">
                                        {logs.current_page} / {logs.last_page}
                                    </span>
                                    <Button
                                        size="sm" variant="outline"
                                        disabled={logs.current_page === logs.last_page}
                                        onClick={() => goToPage(logs.current_page + 1)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
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
