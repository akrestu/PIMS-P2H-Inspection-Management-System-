import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Driver } from '@/types/pims';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    IdCard,
    Mail,
    MoreHorizontal,
    Plus,
    RotateCcw,
    Search,
    User,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

/* ─────────────────────────── Types ─────────────────────────── */
interface PaginatedData {
    data: Driver[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
interface Stats {
    total: number;
    departments: string[];
}
interface Props {
    drivers: PaginatedData;
    filters: { search?: string; department?: string };
    stats: Stats;
}

/* ──────────────────── Avatar helper ────────────────────────── */
function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];
function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* ─────────────────── AddDriverSheet ────────────────────────── */
function AddDriverSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        nik: '',
        nama: '',
        department: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers', { onSuccess: handleClose });
    };

    const fields = [
        { key: 'name' as const, label: 'Nama Lengkap (Login)', placeholder: 'John Doe', icon: User, type: 'text', hint: 'Digunakan sebagai identitas akun.' },
        { key: 'email' as const, label: 'Email', placeholder: 'driver@pims.test', icon: Mail, type: 'email', hint: 'Email unik untuk login ke aplikasi.' },
        { key: 'nik' as const, label: 'NIK Karyawan', placeholder: 'NIK-001', icon: IdCard, type: 'text', hint: 'Nomor Induk Karyawan, harus unik.' },
        { key: 'nama' as const, label: 'Nama (di Formulir P2H)', placeholder: 'John Doe', icon: UserCheck, type: 'text', hint: 'Nama yang muncul pada formulir P2H.' },
        { key: 'department' as const, label: 'Department', placeholder: 'Operasional', icon: Building2, type: 'text', hint: 'Divisi atau departemen driver.' },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="text-lg">Tambah Driver Baru</SheetTitle>
                    <SheetDescription>Buat akun & profil driver sekaligus dalam satu langkah.</SheetDescription>
                </SheetHeader>

                <form id="driver-add-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    {/* Account section */}
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Informasi Akun</p>

                    {fields.slice(0, 2).map(({ key, label, placeholder, icon: Icon, type }) => (
                        <div key={key} className="space-y-1.5">
                            <Label htmlFor={key} className="text-sm font-medium">
                                {label} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Icon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    id={key}
                                    type={type}
                                    value={data[key]}
                                    onChange={(e) => setData(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="h-10 pl-9"
                                    required
                                />
                            </div>
                            {errors[key] && <p className="text-destructive text-xs">{errors[key]}</p>}
                        </div>
                    ))}

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium">
                            Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Min. 8 karakter"
                                className="h-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    <Separator />

                    {/* Profile section */}
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Profil Driver</p>

                    {fields.slice(2).map(({ key, label, placeholder, icon: Icon, hint }) => (
                        <div key={key} className="space-y-1.5">
                            <Label htmlFor={`profile-${key}`} className="text-sm font-medium">
                                {label} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Icon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    id={`profile-${key}`}
                                    value={data[key]}
                                    onChange={(e) => setData(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="h-10 pl-9"
                                    required
                                />
                            </div>
                            <p className="text-muted-foreground text-xs">{hint}</p>
                            {errors[key] && <p className="text-destructive text-xs">{errors[key]}</p>}
                        </div>
                    ))}
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                        Batal
                    </Button>
                    <Button type="submit" form="driver-add-form" disabled={processing} className="flex-1">
                        {processing ? 'Menyimpan...' : 'Tambah Driver'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ─────────────────── EditDriverSheet ───────────────────────── */
function EditDriverSheet({ driver, open, onOpenChange }: { driver: Driver | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        nik: driver?.nik ?? '',
        nama: driver?.nama ?? '',
        department: driver?.department ?? '',
    });

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!driver) return;
        put(`/drivers/${driver.id}`, { onSuccess: handleClose });
    };

    if (!driver) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    {/* Driver preview */}
                    <div className="flex items-center gap-3 pb-2">
                        <Avatar className={`h-10 w-10 text-white ${avatarColor(driver.nama)}`}>
                            <AvatarFallback className={`text-sm font-bold text-white ${avatarColor(driver.nama)}`}>
                                {getInitials(driver.nama)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{driver.nama}</p>
                            <p className="text-muted-foreground text-xs">{driver.user?.email}</p>
                        </div>
                    </div>
                    <SheetTitle className="text-lg">Edit Profil Driver</SheetTitle>
                    <SheetDescription>Perbarui data NIK, nama, dan department driver.</SheetDescription>
                </SheetHeader>

                <form id="driver-edit-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-nik" className="text-sm font-medium">
                            NIK Karyawan <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <IdCard className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                id="edit-nik"
                                value={data.nik}
                                onChange={(e) => setData('nik', e.target.value)}
                                placeholder="NIK-001"
                                className="h-10 pl-9"
                                required
                            />
                        </div>
                        {errors.nik && <p className="text-destructive text-xs">{errors.nik}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-nama" className="text-sm font-medium">
                            Nama (di Formulir P2H) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <UserCheck className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                id="edit-nama"
                                value={data.nama}
                                onChange={(e) => setData('nama', e.target.value)}
                                placeholder="John Doe"
                                className="h-10 pl-9"
                                required
                            />
                        </div>
                        {errors.nama && <p className="text-destructive text-xs">{errors.nama}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-dept" className="text-sm font-medium">
                            Department <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Building2 className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                id="edit-dept"
                                value={data.department}
                                onChange={(e) => setData('department', e.target.value)}
                                placeholder="Operasional"
                                className="h-10 pl-9"
                                required
                            />
                        </div>
                        {errors.department && <p className="text-destructive text-xs">{errors.department}</p>}
                    </div>
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                        Batal
                    </Button>
                    <Button type="submit" form="driver-edit-form" disabled={processing} className="flex-1">
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ──────────────── ViewDriverDialog ─────────────────────────── */
function ViewDriverDialog({ driver, open, onOpenChange }: { driver: Driver | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    if (!driver) return null;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="flex flex-col items-center gap-3 pb-2">
                        <Avatar className={`h-16 w-16 text-white ${avatarColor(driver.nama)}`}>
                            <AvatarFallback className={`text-xl font-bold text-white ${avatarColor(driver.nama)}`}>
                                {getInitials(driver.nama)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <DialogTitle className="text-lg">{driver.nama}</DialogTitle>
                            <DialogDescription>{driver.department}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="space-y-3 rounded-lg border p-4">
                    {[
                        { icon: IdCard, label: 'NIK', value: driver.nik },
                        { icon: Mail, label: 'Email', value: driver.user?.email ?? '—' },
                        { icon: Building2, label: 'Department', value: driver.department },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className="bg-muted rounded-md p-2">
                                <Icon className="text-muted-foreground h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">{label}</p>
                                <p className="text-sm font-medium">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ───────────────────────── Stat Card ───────────────────────── */
function StatCard({ title, value, icon: Icon, sub, colorClass }: {
    title: string; value: number | string; icon: React.ElementType; sub?: string; colorClass: string;
}) {
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
                {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
            </CardContent>
        </Card>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function DriversIndex({ drivers, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [deptFilter, setDeptFilter] = useState(filters.department ?? '');

    const [addOpen, setAddOpen] = useState(false);
    const [editDriver, setEditDriver] = useState<Driver | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [viewDriver, setViewDriver] = useState<Driver | null>(null);
    const [viewOpen, setViewOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback((s: string, d: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/drivers', { search: s, department: d }, { preserveState: true, replace: true });
        }, 350);
    }, []);

    const handleSearch = (val: string) => {
        setSearch(val);
        applyFilters(val, deptFilter);
    };

    const handleDept = (dept: string) => {
        const next = deptFilter === dept ? '' : dept;
        setDeptFilter(next);
        applyFilters(search, next);
    };

    const resetFilters = () => {
        setSearch('');
        setDeptFilter('');
        router.get('/drivers', {}, { preserveState: false });
    };

    const hasActiveFilters = search || deptFilter;

    const openEdit = (driver: Driver) => {
        setEditDriver(driver);
        setEditOpen(true);
    };

    const openView = (driver: Driver) => {
        setViewDriver(driver);
        setViewOpen(true);
    };

    return (
        <TooltipProvider>
            <Head title="Manajemen Driver" />
            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manajemen Driver</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">Kelola akun dan profil seluruh pengemudi kendaraan.</p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Tambah Driver
                    </Button>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                        title="Total Driver"
                        value={stats.total}
                        icon={Users}
                        sub="Terdaftar di sistem"
                        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    />
                    <StatCard
                        title="Halaman Ini"
                        value={drivers.data.length}
                        icon={User}
                        sub={`Halaman ${drivers.current_page} dari ${drivers.last_page}`}
                        colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    />
                    <StatCard
                        title="Department"
                        value={stats.departments.length}
                        icon={Building2}
                        sub="Divisi terdaftar"
                        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    />
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
                                placeholder="Cari nama atau NIK..."
                                className="h-9 pl-9 pr-8"
                            />
                            {search && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {stats.departments.length > 0 && (
                            <>
                                <Separator orientation="vertical" className="hidden h-7 sm:block" />
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-muted-foreground text-xs font-medium">Dept:</span>
                                    {stats.departments.map((dept) => (
                                        <button
                                            key={dept}
                                            onClick={() => handleDept(dept)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                                deptFilter === dept
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border hover:border-primary/60'
                                            }`}
                                        >
                                            {dept}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {hasActiveFilters && (
                            <>
                                <Separator orientation="vertical" className="hidden h-7 sm:block" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 px-2">
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Reset
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Hapus semua filter</TooltipContent>
                                </Tooltip>
                            </>
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
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>NIK</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead className="w-14 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drivers.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="bg-muted rounded-full p-4">
                                                        <Users className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Tidak ada driver ditemukan</p>
                                                        <p className="text-muted-foreground mt-1 text-sm">
                                                            {hasActiveFilters
                                                                ? 'Coba ubah atau reset filter pencarian.'
                                                                : 'Mulai dengan menambahkan driver baru.'}
                                                        </p>
                                                    </div>
                                                    {hasActiveFilters ? (
                                                        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                                                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                                                            <Plus className="h-4 w-4" /> Tambah Driver
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drivers.data.map((driver, idx) => (
                                            <TableRow
                                                key={driver.id}
                                                className="group cursor-pointer"
                                                onClick={() => openView(driver)}
                                            >
                                                <TableCell className="text-muted-foreground text-center text-sm">
                                                    {(drivers.from ?? 1) + idx}
                                                </TableCell>

                                                {/* Driver cell with avatar */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className={`h-8 w-8 shrink-0 ${avatarColor(driver.nama)}`}>
                                                            <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(driver.nama)}`}>
                                                                {getInitials(driver.nama)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{driver.nama}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="font-mono text-sm">{driver.nik}</span>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {driver.department}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                                                    {driver.user?.email ?? '—'}
                                                </TableCell>

                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Aksi</TooltipContent>
                                                        </Tooltip>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem
                                                                onClick={() => openView(driver)}
                                                                className="gap-2"
                                                            >
                                                                <User className="h-4 w-4" />
                                                                Lihat Detail
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => openEdit(driver)}
                                                                className="gap-2"
                                                            >
                                                                <IdCard className="h-4 w-4" />
                                                                Edit Profil
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
                        {drivers.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Menampilkan <span className="font-medium">{drivers.from}</span>–
                                    <span className="font-medium">{drivers.to}</span> dari{' '}
                                    <span className="font-medium">{drivers.total}</span> driver
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={drivers.current_page === 1}
                                        onClick={() => router.get('/drivers', { ...filters, page: drivers.current_page - 1 })}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Prev
                                    </Button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: drivers.last_page }, (_, i) => i + 1)
                                            .filter((p) => p === 1 || p === drivers.last_page || Math.abs(p - drivers.current_page) <= 1)
                                            .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                                if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('...');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, i) =>
                                                p === '...' ? (
                                                    <span key={`ellipsis-${i}`} className="text-muted-foreground px-1 py-1 text-sm">…</span>
                                                ) : (
                                                    <Button
                                                        key={p}
                                                        size="sm"
                                                        variant={p === drivers.current_page ? 'default' : 'outline'}
                                                        onClick={() => router.get('/drivers', { ...filters, page: p })}
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
                                        disabled={drivers.current_page === drivers.last_page}
                                        onClick={() => router.get('/drivers', { ...filters, page: drivers.current_page + 1 })}
                                        className="h-8 gap-1"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {drivers.last_page === 1 && drivers.total > 0 && (
                            <div className="border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Total <span className="font-medium">{drivers.total}</span> driver terdaftar
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Add Sheet ── */}
            <AddDriverSheet open={addOpen} onOpenChange={setAddOpen} />

            {/* ── Edit Sheet ── */}
            <EditDriverSheet
                driver={editDriver}
                open={editOpen}
                onOpenChange={(o) => {
                    setEditOpen(o);
                    if (!o) setEditDriver(null);
                }}
            />

            {/* ── View Dialog ── */}
            <ViewDriverDialog
                driver={viewDriver}
                open={viewOpen}
                onOpenChange={(o) => {
                    setViewOpen(o);
                    if (!o) setViewDriver(null);
                }}
            />
        </TooltipProvider>
    );
}

DriversIndex.layout = {
    breadcrumbs: [{ title: 'Driver', href: '/drivers' }],
};
