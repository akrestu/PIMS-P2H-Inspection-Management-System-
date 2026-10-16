import { Head, router, useForm } from '@inertiajs/react';
import {
    Bus,
    Car,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    MoreHorizontal,
    Package,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageButtons } from '@/components/pagination-bar';
import { TrashTabs } from '@/components/pims/trash-tabs';
import { SiteSelect } from '@/components/site-select';
import { SortableHead, sortParams } from '@/components/sortable-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { Site, Unit, UnitDowntimeLogSummary } from '@/types/pims';

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
interface Props {
    units: PaginatedData;
    filters: Filters;
    sites: Site[];
    tabCounts: { aktif: number; sampah: number };
}

/* ─────────────────── UnitFormDialog (Add / Edit) ─────────────── */
function UnitFormDialog({
    unit,
    sites,
    open,
    onOpenChange,
}: {
    unit?: Unit;
    sites: Site[];
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        no_unit: unit?.no_unit ?? '',
        jenis_unit: unit?.jenis_unit ?? 'Light Vehicle',
        no_lambung: unit?.no_lambung ?? '',
        status: unit?.status ?? 'active',
        department: unit?.department ?? '',
        site_id: unit?.site_id ?? null,
    });

    useEffect(() => {
        setData({
            no_unit: unit?.no_unit ?? '',
            jenis_unit: unit?.jenis_unit ?? 'Light Vehicle',
            no_lambung: unit?.no_lambung ?? '',
            status: unit?.status ?? 'active',
            department: unit?.department ?? '',
            site_id: unit?.site_id ?? null,
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-lg">
                        {unit ? 'Edit Unit' : 'Tambah Unit Baru'}
                    </DialogTitle>
                    <DialogDescription>
                        {unit
                            ? `Perbarui data untuk unit ${unit.no_unit}`
                            : 'Isi formulir berikut untuk mendaftarkan unit baru.'}
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="unit-form"
                    onSubmit={submit}
                    className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-4"
                >
                    {/* No. Unit */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="no_unit"
                            className="text-sm font-medium"
                        >
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
                        {errors.no_unit && (
                            <p className="text-xs text-destructive">
                                {errors.no_unit}
                            </p>
                        )}
                    </div>

                    {/* Jenis Unit */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Jenis Unit{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['Bus', 'Light Vehicle'] as const).map(
                                (jenis) => (
                                    <button
                                        key={jenis}
                                        type="button"
                                        onClick={() =>
                                            setData('jenis_unit', jenis)
                                        }
                                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                                            data.jenis_unit === jenis
                                                ? 'border-primary bg-muted text-foreground'
                                                : 'border-border text-muted-foreground hover:border-foreground/30'
                                        }`}
                                    >
                                        {jenis === 'Bus' ? (
                                            <Bus className="h-6 w-6" />
                                        ) : (
                                            <Car className="h-6 w-6" />
                                        )}
                                        <span className="text-xs font-medium">
                                            {jenis}
                                        </span>
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    {/* No. Polisi */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="no_lambung"
                            className="text-sm font-medium"
                        >
                            No. Polisi{' '}
                            <span className="text-xs text-muted-foreground">
                                (opsional)
                            </span>
                        </Label>
                        <Input
                            id="no_lambung"
                            value={data.no_lambung}
                            onChange={(e) =>
                                setData('no_lambung', e.target.value)
                            }
                            placeholder="Contoh: B-1234-XYZ"
                            className="h-10"
                        />
                    </div>

                    {/* Departemen (LV only) */}
                    {data.jenis_unit === 'Light Vehicle' && (
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="department"
                                className="text-sm font-medium"
                            >
                                Departemen{' '}
                                <span className="text-xs text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Select
                                value={data.department || ''}
                                onValueChange={(v) =>
                                    setData(
                                        'department',
                                        v === '__none__' ? '' : v,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="department"
                                    className="h-10 w-full"
                                >
                                    <SelectValue placeholder="Pilih departemen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">
                                        — Tidak ada —
                                    </SelectItem>
                                    {[
                                        'Management',
                                        'Production',
                                        'Maintenance',
                                        'Supply Chain',
                                        'Engineering',
                                        'HSE',
                                        'HRGA',
                                    ].map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                User LV 2/Approval departemen ini dapat melihat
                                P2H unit LV ini; jabatan Approval dapat
                                menyetujuinya.
                            </p>
                            {errors.department && (
                                <p className="text-xs text-destructive">
                                    {errors.department}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Site */}
                    <SiteSelect
                        sites={sites}
                        value={data.site_id}
                        onChange={(id) => setData('site_id', id)}
                        error={errors.site_id}
                    />

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Status <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={data.status}
                            onValueChange={(v) =>
                                setData('status', v as Unit['status'])
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
                        form="unit-form"
                        disabled={processing}
                        className="flex-1"
                    >
                        {processing
                            ? 'Menyimpan...'
                            : unit
                              ? 'Simpan Perubahan'
                              : 'Tambah Unit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ───────────────── ImportSheet ─────────────────────────────── */
function ImportSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleClose = () => {
        setFile(null);
        onOpenChange(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            return;
        }

        setProcessing(true);
        const formData = new FormData();
        formData.append('file', file);
        router.post('/units/import', formData, {
            forceFormData: true,
            onFinish: () => {
                setProcessing(false);
                handleClose();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        Import Unit dari Excel
                    </DialogTitle>
                    <DialogDescription>
                        Upload file Excel (.xlsx/.xls) sesuai format template.
                        Baris yang error akan dilaporkan dan dilewati.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="import-unit-form"
                    onSubmit={submit}
                    className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-4"
                >
                    <div className="space-y-2 rounded-lg border border-dashed p-4 text-center">
                        <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                            {file ? file.name : 'Pilih file Excel'}
                        </p>
                        {file && (
                            <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileRef.current?.click()}
                        >
                            {file ? 'Ganti File' : 'Pilih File'}
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) =>
                                setFile(e.target.files?.[0] ?? null)
                            }
                        />
                    </div>

                    <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                        <p className="text-xs font-semibold text-foreground">
                            Panduan Import:
                        </p>
                        <ul className="list-inside list-disc space-y-1">
                            <li>Download template terlebih dahulu</li>
                            <li>
                                Isi data sesuai kolom — jangan ubah nama kolom
                                heading
                            </li>
                            <li>
                                Jenis unit valid:{' '}
                                <code className="rounded bg-muted px-1">
                                    Bus
                                </code>
                                ,{' '}
                                <code className="rounded bg-muted px-1">
                                    Light Vehicle
                                </code>
                            </li>
                            <li>
                                Status valid:{' '}
                                <code className="rounded bg-muted px-1">
                                    active
                                </code>
                                ,{' '}
                                <code className="rounded bg-muted px-1">
                                    inactive
                                </code>
                            </li>
                            <li>No. unit harus unik di seluruh sistem</li>
                        </ul>
                    </div>

                    <a
                        href="/units/import-template"
                        className="inline-flex items-center justify-center gap-2 text-sm text-foreground hover:underline"
                    >
                        <Download className="h-4 w-4" />
                        Download Template Excel
                    </a>
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
                        form="import-unit-form"
                        disabled={!file || processing}
                        className="flex-1"
                    >
                        {processing ? 'Mengimport...' : 'Import Sekarang'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────── DeleteConfirmDialog ───────────────────── */
function DeleteConfirmDialog({
    unit,
    open,
    onOpenChange,
}: {
    unit: Unit | null;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!unit) {
            return;
        }

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
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">
                        Hapus Unit?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Unit{' '}
                        <span className="font-semibold text-foreground">
                            {unit?.no_unit}
                        </span>{' '}
                        akan dipindahkan ke sampah. Unit yang dihapus dapat{' '}
                        <span className="font-semibold">
                            dipulihkan kembali
                        </span>{' '}
                        dari halaman Sampah, atau dihapus permanen dari sana.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Unit</span>
                        <span className="font-mono font-medium">
                            {unit?.no_unit}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Jenis</span>
                        <span className="font-medium">{unit?.jenis_unit}</span>
                    </div>
                    {unit?.no_lambung && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                No. Polisi
                            </span>
                            <span className="font-mono font-medium">
                                {unit.no_lambung}
                            </span>
                        </div>
                    )}
                </div>
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
                        {processing ? 'Menghapus...' : 'Hapus Unit'}
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
                        Hapus {count} Unit?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        <span className="font-semibold text-foreground">
                            {count} unit
                        </span>{' '}
                        yang dipilih akan dipindahkan ke sampah. Unit yang
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
                        {processing ? 'Menghapus...' : `Hapus ${count} Unit`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ──────────────────── Operational Status Badge ─────────────── */
type DowntimeTipe = 'BD' | 'PM' | 'Servis Berkala';

const downtimeConfig: Record<
    DowntimeTipe,
    { label: string; cls: string; dot: string }
> = {
    BD: {
        label: 'BD',
        cls: 'border-danger/40 bg-danger-soft text-danger   ',
        dot: 'bg-danger',
    },
    PM: {
        label: 'PM',
        cls: 'border-info/40 bg-info-soft text-info   ',
        dot: 'bg-info',
    },
    'Servis Berkala': {
        label: 'Servis',
        cls: 'border-info/40 bg-info-soft text-info   ',
        dot: 'bg-info',
    },
};

function OperationalStatusBadge({
    downtimeLogs,
}: {
    downtimeLogs?: UnitDowntimeLogSummary[];
}) {
    const ongoing = downtimeLogs?.[0] ?? null;

    if (!ongoing) {
        return (
            <Badge
                variant="outline"
                className="border-success/40 bg-success-soft text-success"
            >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Ready
            </Badge>
        );
    }

    const { label, cls, dot } =
        downtimeConfig[ongoing.tipe as DowntimeTipe] ?? downtimeConfig['BD'];

    return (
        <Badge variant="outline" className={cls}>
            <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dot}`}
            />
            {label}
        </Badge>
    );
}

/* ─────────────── Ubah status operasional unit ─────────────── */
const STATUS_OPTIONS = ['Ready', 'BD', 'PM', 'Servis Berkala'] as const;

function nowLocal(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

    return d.toISOString().slice(0, 16);
}

function UnitStatusControl({ unit }: { unit: Unit }) {
    const current = unit.downtime_logs?.[0]?.tipe ?? 'Ready';
    const [open, setOpen] = useState(false);
    const form = useForm({
        status: current as string,
        waktu: nowLocal(),
        keterangan: '',
    });

    const openDialog = () => {
        form.setData({ status: current, waktu: nowLocal(), keterangan: '' });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(`/units/${unit.id}/status`, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={openDialog}
                className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Ubah status ${unit.no_unit}`}
                title="Klik untuk mengubah status"
            >
                <OperationalStatusBadge downtimeLogs={unit.downtime_logs} />
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={submit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>
                                Status Unit {unit.no_unit}
                            </DialogTitle>
                            <DialogDescription>
                                Status saat ini: <strong>{current}</strong>. P2H
                                berikutnya tetap dapat memperbarui status (BD →
                                BD, Layak Pakai → Ready).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                            <Label>Status baru</Label>
                            <Select
                                value={form.data.status}
                                onValueChange={(v) => form.setData('status', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor={`waktu-${unit.id}`}>
                                Berlaku sejak
                            </Label>
                            <Input
                                id={`waktu-${unit.id}`}
                                type="datetime-local"
                                value={form.data.waktu}
                                max={nowLocal()}
                                onChange={(e) =>
                                    form.setData('waktu', e.target.value)
                                }
                            />
                            {form.errors.waktu && (
                                <p className="text-sm text-destructive">
                                    {form.errors.waktu}
                                </p>
                            )}
                        </div>
                        {form.data.status !== 'Ready' && (
                            <div className="space-y-1.5">
                                <Label htmlFor={`ket-${unit.id}`}>
                                    Keterangan
                                </Label>
                                <Input
                                    id={`ket-${unit.id}`}
                                    value={form.data.keterangan}
                                    placeholder="Contoh: Ganti kampas rem di workshop"
                                    onChange={(e) =>
                                        form.setData(
                                            'keterangan',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    form.processing ||
                                    form.data.status === current
                                }
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function UnitsIndex({
    units,
    filters,
    sites,
    tabCounts,
}: Props) {
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
    const allSelected =
        allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const toggleAll = () => setSelectedIds(allSelected ? [] : allIds);
    const toggleOne = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    const clearSelection = () => setSelectedIds([]);

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback((s: string, j: string, st: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.get(
                '/units',
                { search: s, jenis_unit: j, status: st, ...sortParams() },
                { preserveState: true, replace: true },
            );
        }, 350);
    }, []);

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
            <Head title="Master unit" />
            <div className="flex flex-col gap-6 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                {/* ── Header (MasterUnit-Desktop.png) ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                            Master unit
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {tabCounts.aktif} unit aktif · {tabCounts.sampah} di
                            Sampah
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setImportOpen(true)}
                                    className="gap-2"
                                >
                                    <Upload className="h-4 w-4" /> Import
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Import unit dari file Excel
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a href="/units/export">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Download className="h-4 w-4" /> Export
                                        Excel
                                    </Button>
                                </a>
                            </TooltipTrigger>
                            <TooltipContent>
                                Download daftar unit ke Excel
                            </TooltipContent>
                        </Tooltip>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tambah Unit
                        </Button>
                    </div>
                </div>

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
                                unit dipilih
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
                                {selectedIds.length} Unit
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Filter Bar ── */}
                <div className="flex flex-wrap items-center gap-3">
                    <TrashTabs
                        current="aktif"
                        activeHref="/units"
                        trashHref="/units/trashed"
                        counts={tabCounts}
                    />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <>
                        {/* Search */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari no. unit..."
                                className="pl-9"
                            />
                        </div>

                        <Separator
                            orientation="vertical"
                            className="hidden h-7 sm:block"
                        />

                        {/* Jenis Filter pills */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Jenis:
                            </span>
                            {(['Bus', 'Light Vehicle'] as const).map((j) => (
                                <button
                                    key={j}
                                    onClick={() => handleJenis(j)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                        jenisFilter === j
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-foreground/30 hover:text-primary'
                                    }`}
                                >
                                    {j === 'Bus' ? (
                                        <Bus className="h-3 w-3" />
                                    ) : (
                                        <Car className="h-3 w-3" />
                                    )}
                                    {j}
                                </button>
                            ))}
                        </div>

                        <Separator
                            orientation="vertical"
                            className="hidden h-7 sm:block"
                        />

                        {/* Status Filter pills */}
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

                        {/* Reset */}
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
                    </>
                </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-hidden rounded-[14px] border-(length:--bw) bg-card">
                    <>
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
                                        <SortableHead column="no_unit">
                                            No. Unit
                                        </SortableHead>
                                        <SortableHead column="jenis_unit">
                                            Jenis Unit
                                        </SortableHead>
                                        <SortableHead column="no_lambung">
                                            No. Polisi
                                        </SortableHead>
                                        <SortableHead
                                            column="department"
                                            className="hidden md:table-cell"
                                        >
                                            Departemen
                                        </SortableHead>
                                        <SortableHead
                                            column="site"
                                            className="hidden md:table-cell"
                                        >
                                            Site
                                        </SortableHead>
                                        <SortableHead column="status">
                                            Status
                                        </SortableHead>
                                        <TableHead>Status Unit</TableHead>
                                        <TableHead className="w-14 text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="rounded-full bg-muted p-4">
                                                        <Package className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            Tidak ada unit
                                                            ditemukan
                                                        </p>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {hasActiveFilters
                                                                ? 'Coba ubah atau reset filter pencarian.'
                                                                : 'Mulai dengan menambahkan unit baru.'}
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
                                                            Tambah Unit
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        units.data.map((unit) => (
                                            <TableRow
                                                key={unit.id}
                                                className={`group ${selectedIds.includes(unit.id) ? 'bg-destructive/5' : ''}`}
                                            >
                                                <TableCell className="w-10 pl-4">
                                                    <Checkbox
                                                        checked={selectedIds.includes(
                                                            unit.id,
                                                        )}
                                                        onCheckedChange={() =>
                                                            toggleOne(unit.id)
                                                        }
                                                        aria-label={`Pilih ${unit.no_unit}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold tnum">
                                                        {unit.no_unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1.5 text-sm">
                                                        {unit.jenis_unit ===
                                                        'Bus' ? (
                                                            <Bus className="h-4 w-4 shrink-0 text-warning" />
                                                        ) : (
                                                            <Car className="h-4 w-4 shrink-0 text-info" />
                                                        )}
                                                        {unit.jenis_unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {unit.no_lambung ? (
                                                        <span className="text-sm tnum">
                                                            {unit.no_lambung}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden text-sm md:table-cell">
                                                    {unit.department ? (
                                                        unit.department
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden text-sm md:table-cell">
                                                    {unit.site ? (
                                                        unit.site.name
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            unit.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            unit.status ===
                                                            'active'
                                                                ? 'border-success/40 bg-success-soft text-success'
                                                                : 'border-border bg-muted text-muted-foreground'
                                                        }
                                                    >
                                                        <span
                                                            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${unit.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`}
                                                        />
                                                        {unit.status ===
                                                        'active'
                                                            ? 'Aktif'
                                                            : 'Nonaktif'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <UnitStatusControl
                                                        unit={unit}
                                                    />
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
                                                                                unit,
                                                                            ),
                                                                        0,
                                                                    )
                                                                }
                                                                className="gap-2"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Unit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setTimeout(
                                                                        () =>
                                                                            openDelete(
                                                                                unit,
                                                                            ),
                                                                        0,
                                                                    )
                                                                }
                                                                className="gap-2 text-destructive focus:text-destructive"
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
                                <p className="text-sm text-muted-foreground">
                                    Menampilkan{' '}
                                    <span className="font-medium">
                                        {units.from}
                                    </span>
                                    –
                                    <span className="font-medium">
                                        {units.to}
                                    </span>{' '}
                                    dari{' '}
                                    <span className="font-medium">
                                        {units.total}
                                    </span>{' '}
                                    unit
                                </p>
                                <PageButtons
                                    currentPage={units.current_page}
                                    lastPage={units.last_page}
                                    onPageChange={(page) =>
                                        router.get('/units', {
                                            ...filters,
                                            page,
                                        })
                                    }
                                />
                            </div>
                        )}

                        {/* Simple total when no pagination */}
                        {units.last_page === 1 && units.total > 0 && (
                            <div className="border-t px-4 py-3">
                                <p className="text-sm text-muted-foreground">
                                    Total{' '}
                                    <span className="font-medium">
                                        {units.total}
                                    </span>{' '}
                                    unit
                                </p>
                            </div>
                        )}
                    </>
                </div>
            </div>

            {/* ── Import Sheet ── */}
            <ImportSheet open={importOpen} onOpenChange={setImportOpen} />

            {/* ── Sheet: Add / Edit ── */}
            <UnitFormDialog
                key={editUnit?.id ?? 'add'}
                unit={editUnit}
                sites={sites}
                open={sheetOpen}
                onOpenChange={(o) => {
                    setSheetOpen(o);

                    if (!o) {
                        setEditUnit(undefined);
                    }
                }}
            />

            {/* ── Delete Confirm Dialog ── */}
            <DeleteConfirmDialog
                unit={deleteUnit}
                open={deleteOpen}
                onOpenChange={(o) => {
                    setDeleteOpen(o);

                    if (!o) {
                        setDeleteUnit(null);
                    }
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
