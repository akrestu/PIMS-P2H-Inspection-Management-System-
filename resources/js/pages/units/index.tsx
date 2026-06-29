import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Unit, UnitDowntimeLogSummary } from '@/types/pims';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Bus,
    Car,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    FileSpreadsheet,
    MoreHorizontal,
    Package,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    Truck,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────────────────────── Types ─────────────────────────── */
interface PaginatedData {
    data: Unit[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
interface Filters {
    search?: string;
    jenis_unit?: string;
    status?: string;
}
interface Stats {
    total: number;
    active: number;
    inactive: number;
    bus: number;
    lv: number;
}
interface Props {
    units: PaginatedData;
    filters: Filters;
    stats: Stats;
}

/* ─────────────────── UnitFormSheet (Add / Edit) ─────────────── */
function UnitFormSheet({
    unit,
    open,
    onOpenChange,
}: {
    unit?: Unit;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        no_unit: unit?.no_unit ?? '',
        jenis_unit: unit?.jenis_unit ?? 'Light Vehicle',
        no_lambung: unit?.no_lambung ?? '',
        status: unit?.status ?? 'active',
        department: unit?.department ?? '',
    });

    useEffect(() => {
        setData({
            no_unit: unit?.no_unit ?? '',
            jenis_unit: unit?.jenis_unit ?? 'Light Vehicle',
            no_lambung: unit?.no_lambung ?? '',
            status: unit?.status ?? 'active',
            department: unit?.department ?? '',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unit?.id]);

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (unit) {
            put(`/units/${unit.id}`, { onSuccess: handleClose });
        } else {
            post('/units', { onSuccess: handleClose });
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="text-lg">{unit ? 'Edit Unit' : 'Tambah Unit Baru'}</SheetTitle>
                    <SheetDescription>{unit ? `Perbarui data untuk unit ${unit.no_unit}` : 'Isi formulir berikut untuk mendaftarkan unit baru.'}</SheetDescription>
                </SheetHeader>

                <form id="unit-form" onSubmit={submit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
                    {/* No. Unit */}
                    <div className="space-y-1.5">
                        <Label htmlFor="no_unit" className="text-sm font-medium">
                            No. Unit <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="no_unit"
                            value={data.no_unit}
                            onChange={(e) => setData('no_unit', e.target.value)}
                            placeholder="Contoh: LV-001"
                            className="h-10"
                            required
                        />
                        {errors.no_unit && <p className="text-destructive text-xs">{errors.no_unit}</p>}
                    </div>

                    {/* Jenis Unit */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Jenis Unit <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['Bus', 'Light Vehicle'] as const).map((jenis) => (
                                <button
                                    key={jenis}
                                    type="button"
                                    onClick={() => setData('jenis_unit', jenis)}
                                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                                        data.jenis_unit === jenis
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/50'
                                    }`}
                                >
                                    {jenis === 'Bus' ? <Bus className="h-6 w-6" /> : <Car className="h-6 w-6" />}
                                    <span className="text-xs font-medium">{jenis}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* No. Polisi */}
                    <div className="space-y-1.5">
                        <Label htmlFor="no_lambung" className="text-sm font-medium">
                            No. Polisi <span className="text-muted-foreground text-xs">(opsional)</span>
                        </Label>
                        <Input
                            id="no_lambung"
                            value={data.no_lambung}
                            onChange={(e) => setData('no_lambung', e.target.value)}
                            placeholder="Contoh: B-1234-XYZ"
                            className="h-10"
                        />
                    </div>

                    {/* Departemen (LV only) */}
                    {data.jenis_unit === 'Light Vehicle' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="department" className="text-sm font-medium">
                                Departemen <span className="text-muted-foreground text-xs">(opsional)</span>
                            </Label>
                            <Select value={data.department || ''} onValueChange={(v) => setData('department', v === '__none__' ? '' : v)}>
                                <SelectTrigger id="department" className="h-10">
                                    <SelectValue placeholder="Pilih departemen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">— Tidak ada —</SelectItem>
                                    {['Management', 'Production', 'Maintenance', 'Supply Chain', 'Engineering', 'HSE', 'HRGA'].map((d) => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Staff/Sr.Staff departemen ini dapat melihat & menyetujui P2H unit LV ini.
                            </p>
                            {errors.department && <p className="text-destructive text-xs">{errors.department}</p>}
                        </div>
                    )}

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Status <span className="text-destructive">*</span>
                        </Label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v as Unit['status'])}>
                            <SelectTrigger className="h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                        Active
                                    </span>
                                </SelectItem>
                                <SelectItem value="inactive">
                                    <span className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                                        Inactive
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                        Batal
                    </Button>
                    <Button type="submit" form="unit-form" disabled={processing} className="flex-1">
                        {processing ? 'Menyimpan...' : unit ? 'Simpan Perubahan' : 'Tambah Unit'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ───────────────── ImportSheet ─────────────────────────────── */
function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleClose = () => { setFile(null); onOpenChange(false); };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setProcessing(true);
        const formData = new FormData();
        formData.append('file', file);
        router.post('/units/import', formData, {
            forceFormData: true,
            onFinish: () => { setProcessing(false); handleClose(); },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        Import Unit dari Excel
                    </SheetTitle>
                    <SheetDescription>
                        Upload file Excel (.xlsx/.xls) sesuai format template. Baris yang error akan dilaporkan dan dilewati.
                    </SheetDescription>
                </SheetHeader>

                <form id="import-unit-form" onSubmit={submit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
                    <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">
                            {file ? file.name : 'Pilih file Excel'}
                        </p>
                        {file && (
                            <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                        )}
                        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                            {file ? 'Ganti File' : 'Pilih File'}
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground text-xs">Panduan Import:</p>
                        <ul className="space-y-1 list-disc list-inside">
                            <li>Download template terlebih dahulu</li>
                            <li>Isi data sesuai kolom — jangan ubah nama kolom heading</li>
                            <li>Jenis unit valid: <code className="bg-muted px-1 rounded">Bus</code>, <code className="bg-muted px-1 rounded">Light Vehicle</code></li>
                            <li>Status valid: <code className="bg-muted px-1 rounded">active</code>, <code className="bg-muted px-1 rounded">inactive</code></li>
                            <li>No. unit harus unik di seluruh sistem</li>
                        </ul>
                    </div>

                    <a href="/units/import-template" className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline">
                        <Download className="h-4 w-4" />
                        Download Template Excel
                    </a>
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
                    <Button type="submit" form="import-unit-form" disabled={!file || processing} className="flex-1">
                        {processing ? 'Mengimport...' : 'Import Sekarang'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ──────────────────── DeleteConfirmDialog ───────────────────── */
function DeleteConfirmDialog({ unit, open, onOpenChange }: { unit: Unit | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!unit) return;
        setProcessing(true);
        router.delete(`/units/${unit.id}`, {
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
                    <div className="bg-destructive/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                        <Trash2 className="text-destructive h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center">Hapus Unit?</DialogTitle>
                    <DialogDescription className="text-center">
                        Unit <span className="text-foreground font-semibold">{unit?.no_unit}</span> akan dihapus permanen dari sistem.
                        Tindakan ini <span className="font-semibold text-destructive">tidak dapat dibatalkan</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Unit</span>
                        <span className="font-mono font-medium">{unit?.no_unit}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Jenis</span>
                        <span className="font-medium">{unit?.jenis_unit}</span>
                    </div>
                    {unit?.no_lambung && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">No. Polisi</span>
                            <span className="font-mono font-medium">{unit.no_lambung}</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                        Batal
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={processing} className="flex-1">
                        {processing ? 'Menghapus...' : 'Hapus Permanen'}
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
        router.delete('/units/batch', {
            data: { ids },
            onSuccess: () => { onSuccess(); onOpenChange(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="bg-destructive/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                        <Trash2 className="text-destructive h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center">Hapus {count} Unit?</DialogTitle>
                    <DialogDescription className="text-center">
                        <span className="font-semibold text-foreground">{count} unit</span> yang dipilih akan dihapus permanen dari sistem.
                        Tindakan ini <span className="font-semibold text-destructive">tidak dapat dibatalkan</span>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
                    <Button variant="destructive" onClick={confirm} disabled={processing} className="flex-1">
                        {processing ? 'Menghapus...' : `Hapus ${count} Unit`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────────── Stat Card ────────────────────────── */
function StatCard({ title, value, icon: Icon, colorClass }: { title: string; value: number; icon: React.ElementType; colorClass: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
                <div className={`rounded-md p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

/* ──────────────────── Operational Status Badge ─────────────── */
type DowntimeTipe = 'BD' | 'PM' | 'Servis Berkala';

const downtimeConfig: Record<DowntimeTipe, { label: string; cls: string; dot: string }> = {
    'BD':             { label: 'BD',    cls: 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',       dot: 'bg-red-500' },
    'PM':             { label: 'PM',    cls: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400',   dot: 'bg-blue-500' },
    'Servis Berkala': { label: 'Servis',cls: 'border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
};

function OperationalStatusBadge({ downtimeLogs }: { downtimeLogs?: UnitDowntimeLogSummary[] }) {
    const ongoing = downtimeLogs?.[0] ?? null;

    if (!ongoing) {
        return (
            <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Operation
            </Badge>
        );
    }

    const { label, cls, dot } = downtimeConfig[ongoing.tipe as DowntimeTipe] ?? downtimeConfig['BD'];
    return (
        <Badge variant="outline" className={cls}>
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
        </Badge>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function UnitsIndex({ units, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [jenisFilter, setJenisFilter] = useState(filters.jenis_unit ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');

    // Sheet & Dialog state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editUnit, setEditUnit] = useState<Unit | undefined>(undefined);
    const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    // Batch selection state
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

    const allIds = units.data.map((u) => u.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const toggleAll = () => setSelectedIds(allSelected ? [] : allIds);
    const toggleOne = (id: number) =>
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const clearSelection = () => setSelectedIds([]);

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback(
        (s: string, j: string, st: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                router.get('/units', { search: s, jenis_unit: j, status: st }, { preserveState: true, replace: true });
            }, 350);
        },
        [],
    );

    const handleSearch = (val: string) => {
        setSearch(val);
        applyFilters(val, jenisFilter, statusFilter);
    };

    const handleJenis = (val: string) => {
        const next = jenisFilter === val ? '' : val;
        setJenisFilter(next);
        applyFilters(search, next, statusFilter);
    };

    const handleStatus = (val: string) => {
        const next = statusFilter === val ? '' : val;
        setStatusFilter(next);
        applyFilters(search, jenisFilter, next);
    };

    const resetFilters = () => {
        setSearch('');
        setJenisFilter('');
        setStatusFilter('');
        router.get('/units', {}, { preserveState: false });
    };

    const hasActiveFilters = search || jenisFilter || statusFilter;

    const openAdd = () => {
        setEditUnit(undefined);
        setSheetOpen(true);
    };

    const openEdit = (unit: Unit) => {
        setEditUnit(unit);
        setSheetOpen(true);
    };

    const openDelete = (unit: Unit) => {
        setDeleteUnit(unit);
        setDeleteOpen(true);
    };

    return (
        <TooltipProvider>
            <Head title="Manajemen Unit" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manajemen Unit</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">Kelola data kendaraan Bus & Light Vehicle.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
                                    <Upload className="h-4 w-4" /> Import
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Import unit dari file Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a href="/units/export">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Download className="h-4 w-4" /> Export Excel
                                    </Button>
                                </a>
                            </TooltipTrigger>
                            <TooltipContent>Download daftar unit ke Excel</TooltipContent>
                        </Tooltip>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tambah Unit
                        </Button>
                    </div>
                </div>

                {/* ── Batch Action Bar ── */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={toggleAll}
                                className="border-destructive/60 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                            />
                            <span className="text-sm font-medium">
                                <span className="text-destructive font-semibold">{selectedIds.length}</span> unit dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 gap-1.5 text-muted-foreground">
                                <X className="h-3.5 w-3.5" /> Batalkan
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setBatchDeleteOpen(true)} className="h-8 gap-1.5">
                                <Trash2 className="h-3.5 w-3.5" /> Hapus {selectedIds.length} Unit
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard title="Total Unit" value={stats.total} icon={Truck} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                    <StatCard title="Active" value={stats.active} icon={CheckCircle2} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
                    <StatCard title="Inactive" value={stats.inactive} icon={XCircle} colorClass="bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400" />
                    <StatCard title="Bus" value={stats.bus} icon={Bus} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
                    <StatCard title="Light Vehicle" value={stats.lv} icon={Car} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
                </div>

                {/* ── Filter Bar ── */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 py-3">
                        {/* Search */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari no. unit..."
                                className="h-9 pl-9"
                            />
                        </div>

                        <Separator orientation="vertical" className="hidden h-7 sm:block" />

                        {/* Jenis Filter pills */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs font-medium">Jenis:</span>
                            {(['Bus', 'Light Vehicle'] as const).map((j) => (
                                <button
                                    key={j}
                                    onClick={() => handleJenis(j)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                        jenisFilter === j
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-primary/60 hover:text-primary'
                                    }`}
                                >
                                    {j === 'Bus' ? <Bus className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                                    {j}
                                </button>
                            ))}
                        </div>

                        <Separator orientation="vertical" className="hidden h-7 sm:block" />

                        {/* Status Filter pills */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs font-medium">Status:</span>
                            {(['active', 'inactive'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStatus(s)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                        statusFilter === s
                                            ? s === 'active'
                                                ? 'border-green-500 bg-green-500 text-white'
                                                : 'border-red-500 bg-red-500 text-white'
                                            : 'border-border hover:border-primary/60'
                                    }`}
                                >
                                    {s === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {s === 'active' ? 'Active' : 'Inactive'}
                                </button>
                            ))}
                        </div>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 px-2">
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus semua filter</TooltipContent>
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
                                                ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                                                onCheckedChange={toggleAll}
                                                aria-label="Pilih semua"
                                                disabled={allIds.length === 0}
                                            />
                                        </TableHead>
                                        <TableHead className="w-12 text-center hidden sm:table-cell">#</TableHead>
                                        <TableHead>No. Unit</TableHead>
                                        <TableHead>Jenis Unit</TableHead>
                                        <TableHead>No. Polisi</TableHead>
                                        <TableHead className="hidden md:table-cell">Departemen</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Status Operasional</TableHead>
                                        <TableHead className="w-14 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="bg-muted rounded-full p-4">
                                                        <Package className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Tidak ada unit ditemukan</p>
                                                        <p className="text-muted-foreground mt-1 text-sm">
                                                            {hasActiveFilters ? 'Coba ubah atau reset filter pencarian.' : 'Mulai dengan menambahkan unit baru.'}
                                                        </p>
                                                    </div>
                                                    {hasActiveFilters ? (
                                                        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                                                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={openAdd} className="gap-2">
                                                            <Plus className="h-4 w-4" /> Tambah Unit
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        units.data.map((unit, idx) => (
                                            <TableRow key={unit.id} className={`group ${selectedIds.includes(unit.id) ? 'bg-destructive/5' : ''}`}>
                                                <TableCell className="pl-4 w-10">
                                                    <Checkbox
                                                        checked={selectedIds.includes(unit.id)}
                                                        onCheckedChange={() => toggleOne(unit.id)}
                                                        aria-label={`Pilih ${unit.no_unit}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-center text-sm hidden sm:table-cell">
                                                    {(units.from ?? 1) + idx}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono font-semibold">{unit.no_unit}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1.5 text-sm">
                                                        {unit.jenis_unit === 'Bus' ? (
                                                            <Bus className="text-orange-500 h-4 w-4 shrink-0" />
                                                        ) : (
                                                            <Car className="h-4 w-4 shrink-0 text-purple-500" />
                                                        )}
                                                        {unit.jenis_unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {unit.no_lambung ? (
                                                        <span className="font-mono text-sm">{unit.no_lambung}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-sm">
                                                    {unit.department
                                                        ? unit.department
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={unit.status === 'active' ? 'default' : 'secondary'}
                                                        className={
                                                            unit.status === 'active'
                                                                ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'border-red-200 bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        }
                                                    >
                                                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${unit.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                                                        {unit.status === 'active' ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <OperationalStatusBadge downtimeLogs={unit.downtime_logs} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label="Aksi"
                                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem onClick={() => setTimeout(() => openEdit(unit), 0)} className="gap-2">
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Unit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setTimeout(() => openDelete(unit), 0)}
                                                                className="text-destructive focus:text-destructive gap-2"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Hapus Unit
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

                        {/* Pagination */}
                        {units.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Menampilkan <span className="font-medium">{units.from}</span>–<span className="font-medium">{units.to}</span> dari{' '}
                                    <span className="font-medium">{units.total}</span> unit
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={units.current_page === 1}
                                        onClick={() => router.get('/units', { ...filters, page: units.current_page - 1 })}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Prev
                                    </Button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: units.last_page }, (_, i) => i + 1)
                                            .filter((p) => p === 1 || p === units.last_page || Math.abs(p - units.current_page) <= 1)
                                            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                                if (idx > 0 && (arr[idx - 1] as number) !== p - 1) acc.push('...');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, i) =>
                                                p === '...' ? (
                                                    <span key={`ellipsis-${i}`} className="text-muted-foreground px-1 py-1 text-sm">
                                                        …
                                                    </span>
                                                ) : (
                                                    <Button
                                                        key={p}
                                                        size="sm"
                                                        variant={p === units.current_page ? 'default' : 'outline'}
                                                        onClick={() => router.get('/units', { ...filters, page: p })}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {p}
                                                    </Button>
                                                ),
                                            )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={units.current_page === units.last_page}
                                        onClick={() => router.get('/units', { ...filters, page: units.current_page + 1 })}
                                        className="h-8 gap-1"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Simple total when no pagination */}
                        {units.last_page === 1 && units.total > 0 && (
                            <div className="border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Total <span className="font-medium">{units.total}</span> unit
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Import Sheet ── */}
            <ImportSheet open={importOpen} onOpenChange={setImportOpen} />

            {/* ── Sheet: Add / Edit ── */}
            <UnitFormSheet
                key={editUnit?.id ?? 'add'}
                unit={editUnit}
                open={sheetOpen}
                onOpenChange={(o) => {
                    setSheetOpen(o);
                    if (!o) setEditUnit(undefined);
                }}
            />

            {/* ── Delete Confirm Dialog ── */}
            <DeleteConfirmDialog
                unit={deleteUnit}
                open={deleteOpen}
                onOpenChange={(o) => {
                    setDeleteOpen(o);
                    if (!o) setDeleteUnit(null);
                }}
            />

            {/* ── Batch Delete Dialog ── */}
            <BatchDeleteDialog
                ids={selectedIds}
                open={batchDeleteOpen}
                onOpenChange={setBatchDeleteOpen}
                onSuccess={clearSelection}
            />
        </TooltipProvider>
    );
}

UnitsIndex.layout = {
    breadcrumbs: [{ title: 'Unit', href: '/units' }],
};
