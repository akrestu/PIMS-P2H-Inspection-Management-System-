import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    IdCard,
    Mail,
    MoreHorizontal,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    User,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

/* ─────────────────────────── Types ─────────────────────────── */
type Role = 'admin' | 'manager' | 'driver';

interface UserRow {
    id: number;
    name: string;
    nik: string | null;
    email: string;
    roles: { name: Role }[];
    driver: { nik: string; nama: string; department: string; jenis_unit: 'Bus' | 'Light Vehicle' | null } | null;
}

interface PaginatedData {
    data: UserRow[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Stats {
    total: number;
    admin: number;
    manager: number;
    driver: number;
}

interface Props {
    users: PaginatedData;
    filters: { search?: string; role?: string };
    stats: Stats;
}

/* ─────────────────── Helpers ────────────────────────────────── */
function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
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

function userRole(user: UserRow | null): Role | null {
    return (user?.roles[0]?.name as Role) ?? null;
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; badgeClass: string }> = {
    admin:   { label: 'Admin',   icon: ShieldCheck, badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400' },
    manager: { label: 'Manager', icon: Shield,      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
    driver:  { label: 'Driver',  icon: UserCheck,   badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' },
};

function RoleBadge({ role }: { role: Role | null }) {
    if (!role) return <span className="text-muted-foreground text-xs">—</span>;
    const { label, icon: Icon, badgeClass } = ROLE_META[role];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

/* ─────────────────── Role Select ────────────────────────────── */
function RoleSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">Role <span className="text-destructive">*</span></Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
            </Select>
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

/* ─────────────────── JenisUnitSelect ───────────────────────── */
function JenisUnitSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                Kategori Unit
                <span className="text-muted-foreground ml-1 font-normal">(opsional)</span>
            </Label>
            <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-10">
                    <SelectValue placeholder="Semua unit (tidak dibatasi)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">Semua unit (tidak dibatasi)</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Light Vehicle">Light Vehicle</SelectItem>
                </SelectContent>
            </Select>
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

/* ─────────────────── AddUserSheet ───────────────────────────── */
function AddUserSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        nik: '',
        email: '',
        password: '',
        role: '',
        nama: '',
        department: '',
        jenis_unit: '',
    });
    const [showPwd, setShowPwd] = useState(false);
    const isDriver = data.role === 'driver';

    const handleClose = () => { reset(); onOpenChange(false); };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users', { onSuccess: handleClose });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle>Tambah User Baru</SheetTitle>
                    <SheetDescription>Buat akun user dengan role yang sesuai.</SheetDescription>
                </SheetHeader>

                <form id="user-add-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Informasi Akun</p>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-name" className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="add-name" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                placeholder="John Doe" className="h-10 pl-9" required />
                        </div>
                        {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                    </div>

                    {/* NIK */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-nik" className="text-sm font-medium">NIK <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <IdCard className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="add-nik" value={data.nik} onChange={(e) => setData('nik', e.target.value)}
                                placeholder="Nomor Induk Karyawan" className="h-10 pl-9 tracking-widest" inputMode="numeric" required />
                        </div>
                        {errors.nik && <p className="text-destructive text-xs">{errors.nik}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-email" className="text-sm font-medium">Email <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="add-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                placeholder="user@pims.test" className="h-10 pl-9" required />
                        </div>
                        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-password" className="text-sm font-medium">Password <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <Input id="add-password" type={showPwd ? 'text' : 'password'} value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Min. 8 karakter" className="h-10 pr-10" required />
                            <button type="button" onClick={() => setShowPwd((v) => !v)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors">
                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    {/* Role */}
                    <RoleSelect value={data.role} onChange={(v) => setData('role', v)} error={errors.role} />

                    {/* Driver fields */}
                    {isDriver && (
                        <>
                            <Separator />
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Profil Driver</p>

                            <div className="space-y-1.5">
                                <Label htmlFor="add-nama" className="text-sm font-medium">Nama Panggilan <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <UserCheck className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input id="add-nama" value={data.nama} onChange={(e) => setData('nama', e.target.value)}
                                        placeholder="Nama yang muncul di P2H" className="h-10 pl-9" required />
                                </div>
                                {errors.nama && <p className="text-destructive text-xs">{errors.nama}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="add-dept" className="text-sm font-medium">Department <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <Building2 className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input id="add-dept" value={data.department} onChange={(e) => setData('department', e.target.value)}
                                        placeholder="Operasional" className="h-10 pl-9" required />
                                </div>
                                {errors.department && <p className="text-destructive text-xs">{errors.department}</p>}
                            </div>

                            <JenisUnitSelect
                                value={data.jenis_unit}
                                onChange={(v) => setData('jenis_unit', v)}
                                error={errors.jenis_unit}
                            />
                        </>
                    )}
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
                    <Button type="submit" form="user-add-form" disabled={processing} className="flex-1">
                        {processing ? 'Menyimpan...' : 'Tambah User'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ─────────────────── EditUserSheet ──────────────────────────── */
function EditUserSheet({ user, open, onOpenChange }: { user: UserRow | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: user?.name ?? '',
        nik: user?.nik ?? '',
        email: user?.email ?? '',
        password: '',
        role: (userRole(user) ?? 'driver') as string,
        nama: user?.driver?.nama ?? '',
        department: user?.driver?.department ?? '',
        jenis_unit: user?.driver?.jenis_unit ?? '',
    });
    const [showPwd, setShowPwd] = useState(false);
    const isDriver = data.role === 'driver';

    const handleClose = () => { reset(); onOpenChange(false); };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        put(`/users/${user.id}`, { onSuccess: handleClose });
    };

    if (!user) return null;

    return (
        <Sheet key={user.id} open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col" side="right">
                <SheetHeader className="border-b pb-4">
                    <div className="flex items-center gap-3 pb-1">
                        <Avatar className={`h-10 w-10 ${avatarColor(user.name)}`}>
                            <AvatarFallback className={`text-sm font-bold text-white ${avatarColor(user.name)}`}>
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{user.name}</p>
                            <p className="text-muted-foreground text-xs">{user.email}</p>
                        </div>
                    </div>
                    <SheetTitle>Edit User</SheetTitle>
                    <SheetDescription>Perbarui data akun, role, dan profil user.</SheetDescription>
                </SheetHeader>

                <form id="user-edit-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Informasi Akun</p>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-name" className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="edit-name" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                className="h-10 pl-9" required />
                        </div>
                        {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-nik" className="text-sm font-medium">NIK <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <IdCard className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="edit-nik" value={data.nik ?? ''} onChange={(e) => setData('nik', e.target.value)}
                                className="h-10 pl-9 tracking-widest" inputMode="numeric" required />
                        </div>
                        {errors.nik && <p className="text-destructive text-xs">{errors.nik}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-email" className="text-sm font-medium">Email <span className="text-destructive">*</span></Label>
                        <div className="relative">
                            <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input id="edit-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                className="h-10 pl-9" required />
                        </div>
                        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-password" className="text-sm font-medium">
                            Password Baru <span className="text-muted-foreground font-normal">(kosongkan jika tidak diubah)</span>
                        </Label>
                        <div className="relative">
                            <Input id="edit-password" type={showPwd ? 'text' : 'password'} value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••" className="h-10 pr-10" />
                            <button type="button" onClick={() => setShowPwd((v) => !v)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors">
                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    <RoleSelect value={data.role} onChange={(v) => setData('role', v)} error={errors.role} />

                    {isDriver && (
                        <>
                            <Separator />
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Profil Driver</p>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-nama" className="text-sm font-medium">Nama Panggilan <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <UserCheck className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input id="edit-nama" value={data.nama} onChange={(e) => setData('nama', e.target.value)}
                                        className="h-10 pl-9" required />
                                </div>
                                {errors.nama && <p className="text-destructive text-xs">{errors.nama}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-dept" className="text-sm font-medium">Department <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <Building2 className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input id="edit-dept" value={data.department} onChange={(e) => setData('department', e.target.value)}
                                        className="h-10 pl-9" required />
                                </div>
                                {errors.department && <p className="text-destructive text-xs">{errors.department}</p>}
                            </div>

                            <JenisUnitSelect
                                value={data.jenis_unit}
                                onChange={(v) => setData('jenis_unit', v)}
                                error={errors.jenis_unit}
                            />
                        </>
                    )}
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
                    <Button type="submit" form="user-edit-form" disabled={processing} className="flex-1">
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/* ─────────────────── DeleteDialog ───────────────────────────── */
function DeleteDialog({ user, open, onOpenChange }: { user: UserRow | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);
    if (!user) return null;

    const confirm = () => {
        setProcessing(true);
        router.delete(`/users/${user.id}`, {
            onFinish: () => { setProcessing(false); onOpenChange(false); },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <DialogTitle className="text-center">Hapus User?</DialogTitle>
                    <DialogDescription className="text-center">
                        Akun <span className="font-semibold text-foreground">{user.name}</span> akan dihapus permanen beserta semua data terkait.
                        Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">NIK</span>
                        <span className="font-mono font-medium">{user.nik ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Role</span>
                        <RoleBadge role={userRole(user)} />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
                    <Button variant="destructive" onClick={confirm} disabled={processing} className="flex-1">
                        {processing ? 'Menghapus...' : 'Hapus'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ───────────────── StatCard ─────────────────────────────────── */
function StatCard({ title, value, icon: Icon, colorClass }: {
    title: string; value: number; icon: React.ElementType; colorClass: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
                <div className={`rounded-md p-2 ${colorClass}`}><Icon className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

/* ──────────────────────── Main Page ────────────────────────── */
export default function UsersIndex({ users, filters, stats }: Props) {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;
    const currentUserId = auth.user.id;

    const [search, setSearch] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState(filters.role ?? '');
    const [addOpen, setAddOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserRow | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback((s: string, r: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/users', { search: s, role: r }, { preserveState: true, replace: true });
        }, 350);
    }, []);

    const handleSearch = (val: string) => { setSearch(val); applyFilters(val, roleFilter); };
    const handleRole = (r: string) => {
        const next = roleFilter === r ? '' : r;
        setRoleFilter(next);
        applyFilters(search, next);
    };
    const resetFilters = () => {
        setSearch(''); setRoleFilter('');
        router.get('/users', {}, { preserveState: false });
    };

    const hasFilters = search || roleFilter;

    return (
        <TooltipProvider>
            <Head title="Manajemen User" />
            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">Kelola seluruh akun pengguna sistem.</p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Tambah User
                    </Button>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard title="Total User" value={stats.total} icon={Users}
                        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                    <StatCard title="Admin" value={stats.admin} icon={ShieldCheck}
                        colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
                    <StatCard title="Manager" value={stats.manager} icon={Shield}
                        colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                    <StatCard title="Driver" value={stats.driver} icon={UserCheck}
                        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                </div>

                {/* ── Filter Bar ── */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 py-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari nama, NIK, atau email..." className="h-9 pl-9 pr-8" />
                            {search && (
                                <button onClick={() => handleSearch('')}
                                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <Separator orientation="vertical" className="hidden h-7 sm:block" />

                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs font-medium">Role:</span>
                            {(['admin', 'manager', 'driver'] as Role[]).map((r) => (
                                <button key={r} onClick={() => handleRole(r)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                        roleFilter === r
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-primary/60'
                                    }`}>
                                    {ROLE_META[r].label}
                                </button>
                            ))}
                        </div>

                        {hasFilters && (
                            <>
                                <Separator orientation="vertical" className="hidden h-7 sm:block" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 px-2">
                                            <RotateCcw className="h-3.5 w-3.5" /> Reset
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
                                        <TableHead>User</TableHead>
                                        <TableHead>NIK</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead className="hidden lg:table-cell">Department</TableHead>
                                        <TableHead className="w-14 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="bg-muted rounded-full p-4">
                                                        <Users className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Tidak ada user ditemukan</p>
                                                        <p className="text-muted-foreground mt-1 text-sm">
                                                            {hasFilters ? 'Coba ubah atau reset filter.' : 'Mulai dengan menambahkan user baru.'}
                                                        </p>
                                                    </div>
                                                    {hasFilters ? (
                                                        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                                                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                                                            <Plus className="h-4 w-4" /> Tambah User
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((u, idx) => (
                                            <TableRow key={u.id} className="group">
                                                <TableCell className="text-muted-foreground text-center text-sm">
                                                    {(users.from ?? 1) + idx}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className={`h-8 w-8 shrink-0 ${avatarColor(u.name)}`}>
                                                            <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(u.name)}`}>
                                                                {getInitials(u.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-sm leading-tight">{u.name}</p>
                                                            {u.id === currentUserId && (
                                                                <span className="text-[10px] text-muted-foreground">(Anda)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="font-mono text-sm">{u.nik ?? '—'}</span>
                                                </TableCell>

                                                <TableCell>
                                                    <RoleBadge role={userRole(u)} />
                                                </TableCell>

                                                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                                                    {u.email}
                                                </TableCell>

                                                <TableCell className="hidden text-sm lg:table-cell">
                                                    {u.driver?.department ? (
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                {u.driver.department}
                                                            </Badge>
                                                            {u.driver.jenis_unit && (
                                                                <Badge variant="secondary" className="text-xs font-normal">
                                                                    {u.driver.jenis_unit}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm"
                                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Aksi</TooltipContent>
                                                        </Tooltip>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem onClick={() => setEditUser(u)} className="gap-2">
                                                                <Pencil className="h-4 w-4" /> Edit User
                                                            </DropdownMenuItem>
                                                            {u.id !== currentUserId && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteUser(u)}
                                                                        className="gap-2 text-destructive focus:text-destructive">
                                                                        <Trash2 className="h-4 w-4" /> Hapus User
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
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
                        {users.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Menampilkan <span className="font-medium">{users.from}</span>–
                                    <span className="font-medium">{users.to}</span> dari{' '}
                                    <span className="font-medium">{users.total}</span> user
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" disabled={users.current_page === 1}
                                        onClick={() => router.get('/users', { ...filters, page: users.current_page - 1 })}
                                        className="h-8 gap-1">
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </Button>
                                    {Array.from({ length: users.last_page }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === users.last_page || Math.abs(p - users.current_page) <= 1)
                                        .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                            if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('...');
                                            acc.push(p); return acc;
                                        }, [])
                                        .map((p, i) =>
                                            p === '...' ? (
                                                <span key={`e-${i}`} className="text-muted-foreground px-1 text-sm">…</span>
                                            ) : (
                                                <Button key={p} size="sm"
                                                    variant={p === users.current_page ? 'default' : 'outline'}
                                                    onClick={() => router.get('/users', { ...filters, page: p })}
                                                    className="h-8 w-8 p-0">
                                                    {p}
                                                </Button>
                                            )
                                        )}
                                    <Button variant="outline" size="sm" disabled={users.current_page === users.last_page}
                                        onClick={() => router.get('/users', { ...filters, page: users.current_page + 1 })}
                                        className="h-8 gap-1">
                                        Next <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {users.last_page === 1 && users.total > 0 && (
                            <div className="border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Total <span className="font-medium">{users.total}</span> user terdaftar
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AddUserSheet open={addOpen} onOpenChange={setAddOpen} />
            <EditUserSheet user={editUser} open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }} />
            <DeleteDialog user={deleteUser} open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }} />
        </TooltipProvider>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Manajemen User', href: '/users' }],
};
