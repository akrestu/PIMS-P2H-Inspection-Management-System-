import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageButtons } from '@/components/pagination-bar';
import { TrashTabs } from '@/components/pims/trash-tabs';
import { SortableHead, sortParams } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Site } from '@/types/pims';

interface SiteRow extends Site {
    units_count: number;
    users_count: number;
}

interface PaginatedData {
    data: SiteRow[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
interface Filters {
    search?: string;
    status?: string;
}
interface Props {
    tabCounts: { aktif: number; sampah: number };
    sites: PaginatedData;
    filters: Filters;
}

/* ─────────────────── SiteFormDialog (Add / Edit) ─────────────── */
function SiteFormDialog({
    site,
    open,
    onOpenChange,
}: {
    site?: Site;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: site?.name ?? '',
        status: site?.status ?? 'active',
    });

    useEffect(() => {
        setData({
            name: site?.name ?? '',
            status: site?.status ?? 'active',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [site?.id]);

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (site) {
            put(`/sites/${site.id}`, { onSuccess: handleClose });
        } else {
            post('/sites', { onSuccess: handleClose });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-lg">
                        {site ? 'Edit Site' : 'Tambah Site Baru'}
                    </DialogTitle>
                    <DialogDescription>
                        {site
                            ? `Perbarui data untuk site ${site.name}`
                            : 'Isi formulir berikut untuk mendaftarkan site baru.'}
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="site-form"
                    onSubmit={submit}
                    className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-4"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Nama Site{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: PT. WBK Site MAS"
                            className="h-10"
                            required
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Status <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={data.status}
                            onValueChange={(v) =>
                                setData('status', v as Site['status'])
                            }
                        >
                            <SelectTrigger className="h-10 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                        Aktif
                                    </span>
                                </SelectItem>
                                <SelectItem value="inactive">
                                    <span className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-danger" />
                                        Nonaktif
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </form>

                <DialogFooter className="border-t px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        form="site-form"
                        disabled={processing}
                        className="flex-1"
                    >
                        {processing
                            ? 'Menyimpan...'
                            : site
                              ? 'Simpan Perubahan'
                              : 'Tambah Site'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────── DeleteConfirmDialog ───────────────────── */
function DeleteConfirmDialog({
    site,
    open,
    onOpenChange,
}: {
    site: SiteRow | null;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!site) {
            return;
        }

        setProcessing(true);
        router.delete(`/sites/${site.id}`, {
            onFinish: () => {
                setProcessing(false);
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">
                        Hapus Site?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Site{' '}
                        <span className="font-semibold text-foreground">
                            {site?.name}
                        </span>{' '}
                        akan dipindahkan ke sampah. Unit dan user yang terhubung
                        akan otomatis kehilangan site ini (tidak ikut terhapus).
                        Site yang dihapus dapat{' '}
                        <span className="font-semibold">
                            dipulihkan kembali
                        </span>{' '}
                        dari halaman Sampah, atau dihapus permanen dari sana.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={processing}
                        className="flex-1"
                    >
                        {processing ? 'Menghapus...' : 'Hapus Site'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────── BatchDeleteDialog ────────────────── */
function BatchDeleteDialog({
    ids,
    open,
    onOpenChange,
    onSuccess,
}: {
    ids: number[];
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onSuccess: () => void;
}) {
    const [processing, setProcessing] = useState(false);
    const count = ids.length;

    const confirm = () => {
        setProcessing(true);
        router.delete('/sites/batch', {
            data: { ids },
            onSuccess: () => {
                onSuccess();
                onOpenChange(false);
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">
                        Hapus {count} Site?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        <span className="font-semibold text-foreground">
                            {count} site
                        </span>{' '}
                        yang dipilih akan dipindahkan ke sampah. Site yang
                        dihapus dapat{' '}
                        <span className="font-semibold">
                            dipulihkan kembali
                        </span>{' '}
                        dari halaman Sampah, atau dihapus permanen dari sana.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={confirm}
                        disabled={processing}
                        className="flex-1"
                    >
                        {processing ? 'Menghapus...' : `Hapus ${count} Site`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function SitesIndex({
    sites,
    filters,
    tabCounts,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editSite, setEditSite] = useState<Site | undefined>(undefined);
    const [deleteSite, setDeleteSite] = useState<SiteRow | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

    const allIds = sites.data.map((s) => s.id);
    const allSelected =
        allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const toggleAll = () => setSelectedIds(allSelected ? [] : allIds);
    const toggleOne = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    const clearSelection = () => setSelectedIds([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback((s: string, st: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.get(
                '/sites',
                { search: s, status: st, ...sortParams() },
                { preserveState: true, replace: true },
            );
        }, 350);
    }, []);

    const handleSearch = (val: string) => {
        setSearch(val);
        applyFilters(val, statusFilter);
    };

    const handleStatus = (val: string) => {
        const next = statusFilter === val ? '' : val;
        setStatusFilter(next);
        applyFilters(search, next);
    };

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('');
        router.get('/sites', {}, { preserveState: false });
    };

    const hasActiveFilters = search || statusFilter;

    const openAdd = () => {
        setEditSite(undefined);
        setDialogOpen(true);
    };

    const openEdit = (site: Site) => {
        setEditSite(site);
        setDialogOpen(true);
    };

    const openDelete = (site: SiteRow) => {
        setDeleteSite(site);
        setDeleteOpen(true);
    };

    return (
        <TooltipProvider>
            <Head title="Master site" />
            <div className="flex flex-col gap-6 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                            Master site
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {tabCounts.aktif} site · {tabCounts.sampah} di
                            Sampah
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tambah Site
                        </Button>
                    </div>
                </div>

                <TrashTabs
                    current="aktif"
                    activeHref="/sites"
                    trashHref="/sites/trashed"
                    counts={tabCounts}
                    className="self-start"
                />

                {/* ── Batch Action Bar ── */}
                {selectedIds.length > 0 && (
                    <div className="flex animate-in items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 duration-200 fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={toggleAll}
                                className="border-destructive/60 data-[state=checked]:border-destructive data-[state=checked]:bg-destructive"
                            />
                            <span className="text-sm font-medium">
                                <span className="font-semibold text-destructive">
                                    {selectedIds.length}
                                </span>{' '}
                                site dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSelection}
                                className="h-8 gap-1.5 text-muted-foreground"
                            >
                                <X className="h-3.5 w-3.5" /> Batalkan
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBatchDeleteOpen(true)}
                                className="h-8 gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus{' '}
                                {selectedIds.length} Site
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Filter Bar ── */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 py-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari nama site..."
                                className="pl-9"
                            />
                        </div>

                        <Separator
                            orientation="vertical"
                            className="hidden h-7 sm:block"
                        />

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Status:
                            </span>
                            {(['active', 'inactive'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStatus(s)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                        statusFilter === s
                                            ? s === 'active'
                                                ? 'border-success bg-success text-white'
                                                : 'border-danger bg-danger text-white'
                                            : 'border-border hover:border-foreground/30'
                                    }`}
                                >
                                    {s === 'active' ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                        <XCircle className="h-3 w-3" />
                                    )}
                                    {s === 'active' ? 'Aktif' : 'Nonaktif'}
                                </button>
                            ))}
                        </div>

                        {hasActiveFilters && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="h-9 gap-1.5 px-2"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Hapus semua filter
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </CardContent>
                </Card>

                {/* ── Table ── */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-10 pl-4">
                                            <Checkbox
                                                checked={allSelected}
                                                ref={(el) => {
                                                    if (el) {
                                                        (
                                                            el as any
                                                        ).indeterminate =
                                                            someSelected;
                                                    }
                                                }}
                                                onCheckedChange={toggleAll}
                                                aria-label="Pilih semua"
                                                disabled={allIds.length === 0}
                                            />
                                        </TableHead>
                                        <TableHead className="hidden w-12 text-center sm:table-cell">
                                            #
                                        </TableHead>
                                        <SortableHead column="name">
                                            Nama Site
                                        </SortableHead>
                                        <SortableHead
                                            column="units_count"
                                            descFirst
                                        >
                                            Unit
                                        </SortableHead>
                                        <SortableHead
                                            column="users_count"
                                            descFirst
                                        >
                                            Manpower
                                        </SortableHead>
                                        <SortableHead column="status">
                                            Status
                                        </SortableHead>
                                        <TableHead className="w-14 text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="rounded-full bg-muted p-4">
                                                        <Building2 className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            Tidak ada site
                                                            ditemukan
                                                        </p>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {hasActiveFilters
                                                                ? 'Coba ubah atau reset filter pencarian.'
                                                                : 'Mulai dengan menambahkan site baru.'}
                                                        </p>
                                                    </div>
                                                    {hasActiveFilters ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={
                                                                resetFilters
                                                            }
                                                            className="gap-2"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />{' '}
                                                            Reset Filter
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={openAdd}
                                                            className="gap-2"
                                                        >
                                                            <Plus className="h-4 w-4" />{' '}
                                                            Tambah Site
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sites.data.map((site, idx) => (
                                            <TableRow
                                                key={site.id}
                                                className={`group ${selectedIds.includes(site.id) ? 'bg-destructive/5' : ''}`}
                                            >
                                                <TableCell className="w-10 pl-4">
                                                    <Checkbox
                                                        checked={selectedIds.includes(
                                                            site.id,
                                                        )}
                                                        onCheckedChange={() =>
                                                            toggleOne(site.id)
                                                        }
                                                        aria-label={`Pilih ${site.name}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="hidden text-center text-sm text-muted-foreground sm:table-cell">
                                                    {(sites.from ?? 1) + idx}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        {site.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {site.units_count}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {site.users_count}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            site.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            site.status ===
                                                            'active'
                                                                ? 'border-success/40 bg-success-soft text-success'
                                                                : 'border-border bg-muted text-muted-foreground'
                                                        }
                                                    >
                                                        <span
                                                            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${site.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`}
                                                        />
                                                        {site.status ===
                                                        'active'
                                                            ? 'Aktif'
                                                            : 'Nonaktif'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label="Aksi"
                                                                className="h-10 w-10 p-0 focus-visible:opacity-100 data-[state=open]:opacity-100 md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-44"
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setTimeout(
                                                                        () =>
                                                                            openEdit(
                                                                                site,
                                                                            ),
                                                                        0,
                                                                    )
                                                                }
                                                                className="gap-2"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Site
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setTimeout(
                                                                        () =>
                                                                            openDelete(
                                                                                site,
                                                                            ),
                                                                        0,
                                                                    )
                                                                }
                                                                className="gap-2 text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Hapus Site
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {sites.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-sm text-muted-foreground">
                                    Menampilkan{' '}
                                    <span className="font-medium">
                                        {sites.from}
                                    </span>
                                    –
                                    <span className="font-medium">
                                        {sites.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-medium">
                                        {sites.total}
                                    </span>{' '}
                                    site
                                </p>
                                <PageButtons
                                    currentPage={sites.current_page}
                                    lastPage={sites.last_page}
                                    onPageChange={(page) =>
                                        router.get('/sites', {
                                            ...filters,
                                            page,
                                        })
                                    }
                                />
                            </div>
                        )}

                        {sites.last_page === 1 && sites.total > 0 && (
                            <div className="border-t px-4 py-3">
                                <p className="text-sm text-muted-foreground">
                                    Total{' '}
                                    <span className="font-medium">
                                        {sites.total}
                                    </span>{' '}
                                    site
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <SiteFormDialog
                key={editSite?.id ?? 'add'}
                site={editSite}
                open={dialogOpen}
                onOpenChange={(o) => {
                    setDialogOpen(o);

                    if (!o) {
                        setEditSite(undefined);
                    }
                }}
            />

            <DeleteConfirmDialog
                site={deleteSite}
                open={deleteOpen}
                onOpenChange={(o) => {
                    setDeleteOpen(o);

                    if (!o) {
                        setDeleteSite(null);
                    }
                }}
            />

            <BatchDeleteDialog
                ids={selectedIds}
                open={batchDeleteOpen}
                onOpenChange={setBatchDeleteOpen}
                onSuccess={clearSelection}
            />
        </TooltipProvider>
    );
}

SitesIndex.layout = {
    breadcrumbs: [{ title: 'Master site', href: '/sites' }],
};
