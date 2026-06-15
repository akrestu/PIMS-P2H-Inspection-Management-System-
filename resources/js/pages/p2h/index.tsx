import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Bus,
    CalendarDays,
    Car,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface P2hRow {
    id: number;
    tanggal: string;
    no_unit: string;
    jenis_unit: string;
    slot_terisi: number;
    total_tl: number;
    status: string;
}

interface PaginatedData {
    data: P2hRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    date_from?: string;
    date_to?: string;
    no_unit?: string;
    jenis_unit?: string;
    hasil?: string;
    user_id?: string;
    [key: string]: string | undefined;
}

interface SimpleUser {
    id: number;
    name: string;
}

interface Props {
    sessions: PaginatedData;
    filters: Filters;
    allUsers: SimpleUser[];
}

// Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one in WIB timezone
function parseDateLocal(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// ── Quick filter chips ────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
})();

const QUICK_FILTERS = [
    { label: 'Hari Ini', value: { date_from: today, date_to: today } },
    { label: 'Minggu Ini', value: { date_from: weekStart, date_to: today } },
    { label: 'Ada TL', value: { hasil: 'ada_tl' } },
    { label: 'Semua Layak', value: { hasil: 'semua_layak' } },
    { label: 'Bus', value: { jenis_unit: 'Bus' } },
    { label: 'LV', value: { jenis_unit: 'Light Vehicle' } },
];

function isQuickActive(qf: typeof QUICK_FILTERS[0], form: Filters) {
    return Object.entries(qf.value).every(([k, v]) => form[k] === v);
}

// ── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteDialog({
    row,
    open,
    onClose,
}: {
    row: P2hRow | null;
    open: boolean;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        if (!row) return;
        setProcessing(true);
        router.delete(`/p2h/${row.id}`, {
            onFinish: () => {
                setProcessing(false);
                onClose();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Hapus Riwayat P2H
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2 pt-1 text-sm text-muted-foreground">
                            <p>
                                Anda akan menghapus sesi P2H berikut secara permanen:
                            </p>
                            {row && (
                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    <p className="font-semibold text-foreground">{row.no_unit}</p>
                                    <p className="text-xs">
                                        {parseDateLocal(row.tanggal).toLocaleDateString('id-ID', {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                        })}
                                        {' · '}{row.slot_terisi}x P2H · {row.total_tl > 0 ? `${row.total_tl} item TL` : 'Semua Layak'}
                                    </p>
                                </div>
                            )}
                            <p className="text-destructive font-medium">
                                Semua data checklist, tanda tangan, dan log bahan bakar dalam sesi ini akan ikut terhapus dan tidak dapat dikembalikan.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Batal
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={processing} className="gap-2">
                        {processing ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Hapus Permanen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({
    row,
    isAdmin,
    onDelete,
}: {
    row: P2hRow;
    isAdmin: boolean;
    onDelete: (row: P2hRow) => void;
}) {
    const hasTL = row.total_tl > 0;
    const isCompleted = row.status === 'completed';
    const isLV = row.jenis_unit === 'Light Vehicle';

    const formattedDate = parseDateLocal(row.tanggal).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div
            className={cn(
                'group relative rounded-xl border-2 p-4 transition-all duration-150 hover:border-primary/40 hover:shadow-md active:scale-[0.99]',
                hasTL ? 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10' : 'border-border bg-card',
            )}
        >
            {/* Top row */}
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        isLV ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-purple-100 dark:bg-purple-950/40',
                    )}>
                        {isLV
                            ? <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            : <Bus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        }
                    </div>
                    <div>
                        <p className="text-base font-bold leading-tight">{row.no_unit}</p>
                        <p className="text-xs text-muted-foreground">{row.jenis_unit}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {hasTL ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            {row.total_tl} TL
                        </Badge>
                    ) : (
                        <Badge className="gap-1 bg-green-500 text-xs hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Layak
                        </Badge>
                    )}
                </div>
            </div>

            {/* Meta info */}
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {row.slot_terisi}x P2H hari ini
                </span>
            </div>

            {/* P2H count indicator */}
            <div className="mb-3 flex gap-1.5">
                {Array.from({ length: row.slot_terisi }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
                    {isCompleted ? 'Selesai' : 'Open'}
                </Badge>
                <div className="flex items-center gap-1">
                    {isAdmin && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.preventDefault(); onDelete(row); }}
                            title="Hapus sesi P2H"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5 text-xs">
                        <a href={`/p2h/${row.id}/export-pdf`} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5" />
                            PDF
                        </a>
                    </Button>
                    <Button asChild size="sm" className="h-8 gap-1.5 px-3 text-xs">
                        <Link href={`/p2h/${row.id}`}>
                            Lihat Detail
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Card skeleton ─────────────────────────────────────────────────────────────
function SessionCardSkeleton() {
    return (
        <div className="rounded-xl border-2 border-border p-4 space-y-3">
            <div className="flex items-center gap-2.5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <Skeleton className="h-3 w-40" />
            <div className="flex gap-1.5">
                {[1,2,3].map(i => <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />)}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function P2hIndex({ sessions, filters, allUsers }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>().props;
    const isAdmin = auth?.user?.roles?.includes('admin') ?? false;

    const [form, setForm] = useState<Filters>(filters);
    const [showFilter, setShowFilter] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<P2hRow | null>(null);

    const hasActiveFilters = Object.values(form).some(Boolean);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/p2h', form, { preserveState: true });
    };

    const handleReset = () => {
        setForm({});
        router.get('/p2h', {});
    };

    const applyQuickFilter = (qf: typeof QUICK_FILTERS[0]) => {
        const newForm = isQuickActive(qf, form)
            ? {}
            : { ...qf.value } as Filters;
        setForm(newForm);
        router.get('/p2h', newForm, { preserveState: true });
    };

    const goToPage = (page: number) => {
        router.get('/p2h', { ...filters, page }, { preserveState: true });
    };

    return (
        <>
            <Head title="Riwayat P2H" />
            <div className="flex flex-col gap-4 p-4 md:p-6">

                {/* ── Page Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold md:text-2xl">Riwayat P2H</h1>
                        <p className="text-xs text-muted-foreground">
                            {sessions.total > 0
                                ? `${sessions.total} sesi ditemukan`
                                : 'Belum ada data'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilter ? 'default' : 'outline'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filter
                            {hasActiveFilters && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                                    {Object.values(form).filter(Boolean).length}
                                </span>
                            )}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Unduh Riwayat P2H</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/export/history-p2h/pdf?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null && v !== '') as [string, string][])).toString()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileText className="h-4 w-4 text-red-500" />
                                        Export PDF
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/export/history-p2h/excel?${new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v != null && v !== '') as [string, string][])).toString()}`}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        Export Excel
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ── Quick Filter Chips ── */}
                <div className="flex flex-wrap gap-2">
                    {QUICK_FILTERS.map((qf) => {
                        const active = isQuickActive(qf, form);
                        return (
                            <button
                                key={qf.label}
                                type="button"
                                onClick={() => applyQuickFilter(qf)}
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all',
                                    active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
                                )}
                            >
                                {active && <X className="h-3 w-3" />}
                                {qf.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Advanced Filter Panel ── */}
                {showFilter && (
                    <Card className="border-primary/20">
                        <CardContent className="pt-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">Filter Lanjutan</span>
                            </div>
                            <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={form.date_from ?? ''}
                                        onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={form.date_to ?? ''}
                                        onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">No. Unit</Label>
                                    <Input
                                        value={form.no_unit ?? ''}
                                        onChange={(e) => setForm({ ...form, no_unit: e.target.value })}
                                        placeholder="Cari no. unit…"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Jenis Unit</Label>
                                    <Select
                                        value={form.jenis_unit ?? 'all'}
                                        onValueChange={(v) => setForm({ ...form, jenis_unit: v === 'all' ? undefined : v })}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Semua jenis" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua jenis</SelectItem>
                                            <SelectItem value="Bus">Bus</SelectItem>
                                            <SelectItem value="Light Vehicle">Light Vehicle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Hasil Pemeriksaan</Label>
                                    <Select
                                        value={form.hasil ?? 'all'}
                                        onValueChange={(v) => setForm({ ...form, hasil: v === 'all' ? undefined : v })}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Semua hasil" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua hasil</SelectItem>
                                            <SelectItem value="ada_tl">Ada Item Tidak Layak</SelectItem>
                                            <SelectItem value="semua_layak">Semua Layak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {allUsers.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Driver</Label>
                                        <Select
                                            value={form.user_id ?? 'all'}
                                            onValueChange={(v) => setForm({ ...form, user_id: v === 'all' ? undefined : v })}
                                        >
                                            <SelectTrigger className="h-10"><SelectValue placeholder="Semua driver" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua driver</SelectItem>
                                                {allUsers.map((u) => (
                                                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <Button type="submit" className="h-10 flex-1 gap-2">
                                        <Search className="h-4 w-4" />
                                        Cari
                                    </Button>
                                    <Button type="button" variant="outline" className="h-10 gap-2" onClick={handleReset}>
                                        <X className="h-4 w-4" />
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* ── Results ── */}
                {sessions.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-semibold">Tidak ada data P2H</p>
                            <p className="text-sm text-muted-foreground">
                                {hasActiveFilters ? 'Coba ubah filter pencarian.' : 'Belum ada sesi P2H yang tercatat.'}
                            </p>
                        </div>
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={handleReset}>
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Hapus Filter
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sessions.data.map((row) => (
                                <SessionCard
                                    key={row.id}
                                    row={row}
                                    isAdmin={isAdmin}
                                    onDelete={setDeleteTarget}
                                />
                            ))}
                        </div>

                        {/* ── Pagination ── */}
                        {sessions.last_page > 1 && (
                            <>
                                <Separator />
                                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Menampilkan {sessions.from}–{sessions.to} dari {sessions.total} sesi
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={sessions.current_page === 1}
                                            onClick={() => goToPage(sessions.current_page - 1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        {/* Page numbers — show max 5 around current */}
                                        {(() => {
                                            const total = sessions.last_page;
                                            const cur = sessions.current_page;
                                            const pages: (number | 'ellipsis')[] = [];

                                            if (total <= 7) {
                                                for (let i = 1; i <= total; i++) pages.push(i);
                                            } else {
                                                pages.push(1);
                                                if (cur > 3) pages.push('ellipsis');
                                                for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
                                                if (cur < total - 2) pages.push('ellipsis');
                                                pages.push(total);
                                            }

                                            return pages.map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <span key={`e${idx}`} className="px-1 text-sm text-muted-foreground">…</span>
                                                ) : (
                                                    <Button
                                                        key={p}
                                                        size="sm"
                                                        variant={p === cur ? 'default' : 'outline'}
                                                        onClick={() => goToPage(p)}
                                                        className="h-8 w-8 p-0 text-xs"
                                                    >
                                                        {p}
                                                    </Button>
                                                )
                                            );
                                        })()}

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={sessions.current_page === sessions.last_page}
                                            onClick={() => goToPage(sessions.current_page + 1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ── Delete Dialog ── */}
            <DeleteDialog
                row={deleteTarget}
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
            />
        </>
    );
}

P2hIndex.layout = {
    breadcrumbs: [{ title: 'Riwayat P2H', href: '/p2h' }],
};
