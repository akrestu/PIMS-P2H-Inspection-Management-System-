import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    EyeOff,
    FileSpreadsheet,
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
    Upload,
    User,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
// UserCheck masih dipakai untuk role badge driver
import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────────────────────── Types ─────────────────────────── */
type Role = 'admin' | 'manager' | 'driver';

interface UnitOption {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
}

type Jabatan = 'Sr.Staff' | 'Staff' | 'Non Staff';

interface UserRow {
    id: number;
    name: string;
    nik: string | null;
    email: string | null;
    jabatan: Jabatan | null;
    department: string | null;
    jenis_unit: string | null;
    roles: { name: Role }[];
    units?: UnitOption[];
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
    filters: { search?: string; role?: string; jabatan?: string; per_page?: string };
    stats: Stats;
    units: UnitOption[];
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

/* ─────────────────── JabatanSelect ─────────────────────────── */
const JABATAN_LIST: Jabatan[] = ['Sr.Staff', 'Staff', 'Non Staff'];
const JABATAN_META: Record<Jabatan, string> = {
    'Sr.Staff': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    'Staff':    'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400',
    'Non Staff':'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400',
};

function JabatanBadge({ jabatan }: { jabatan: Jabatan | null }) {
    if (!jabatan) return <span className="text-muted-foreground text-xs">—</span>;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${JABATAN_META[jabatan]}`}>
            {jabatan}
        </span>
    );
}

function JabatanSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">Jabatan <span className="text-destructive">*</span></Label>
            <Select value={value || ''} onValueChange={onChange}>
                <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih jabatan..." />
                </SelectTrigger>
                <SelectContent>
                    {JABATAN_LIST.map((j) => (
                        <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
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

/* ─────────────── AssignedUnitsSelect ───────────────────────── */
function AssignedUnitsSelect({
    units,
    selected,
    onChange,
    error,
}: {
    units: UnitOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    error?: string;
}) {
    const [unitSearch, setUnitSearch] = useState('');

    const toggle = (id: number) => {
        onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    };

    const filteredUnits = unitSearch.trim()
        ? units.filter((u) =>
              u.no_unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
              u.jenis_unit.toLowerCase().includes(unitSearch.toLowerCase()),
          )
        : units;

    const selectedUnits = units.filter((u) => selected.includes(u.id));

    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                Unit yang Di-assign
                <span className="text-muted-foreground ml-1 font-normal">(opsional, bisa beberapa)</span>
            </Label>
            <p className="text-muted-foreground text-xs">
                Jika diisi, driver hanya melihat unit ini di form P2H. Jika kosong, fallback ke Kategori Unit.
            </p>
            {units.length > 5 && (
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        placeholder="Cari nomor unit…"
                        className="h-8 pl-8 text-xs"
                    />
                </div>
            )}
            <div className="rounded-md border max-h-40 overflow-y-auto divide-y">
                {filteredUnits.length === 0 && (
                    <p className="text-muted-foreground px-3 py-2 text-xs">
                        {unitSearch ? 'Unit tidak ditemukan.' : 'Tidak ada unit aktif.'}
                    </p>
                )}
                {filteredUnits.map((unit) => (
                    <label
                        key={unit.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(unit.id)}
                            onChange={() => toggle(unit.id)}
                            className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span className="flex-1 text-sm font-medium">{unit.no_unit}</span>
                        <span className="text-muted-foreground text-xs">{unit.jenis_unit}</span>
                    </label>
                ))}
            </div>
            {selectedUnits.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                    {selectedUnits.map((u) => (
                        <span
                            key={u.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium"
                        >
                            {u.no_unit}
                            <button type="button" onClick={() => toggle(u.id)} className="hover:text-destructive transition-colors">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

/* ─────────────────── UserFormFields (shared) ────────────────── */
function UserFormFields<T extends {
    name: string; nik: string; email: string; password: string; role: string;
    jabatan: string; department: string; jenis_unit: string; assigned_unit_ids: number[];
}>({
    data, setData, errors, units, isEdit = false,
}: {
    data: T;
    setData: (key: keyof T, value: any) => void;
    errors: Partial<Record<keyof T, string>>;
    units: UnitOption[];
    isEdit?: boolean;
}) {
    const [showPwd, setShowPwd] = useState(false);
    const isAdmin = data.role === 'admin';
    const isDriver = data.role === 'driver';
    const needsProfile = !isAdmin;

    return (
        <>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Informasi Akun</p>

            <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                <div className="relative">
                    <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input value={data.name} onChange={(e) => setData('name' as keyof T, e.target.value)}
                        placeholder="John Doe" className="h-10 pl-9" required />
                </div>
                {errors.name && <p className="text-destructive text-xs">{errors.name as string}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className="text-sm font-medium">NIK / NRPP <span className="text-destructive">*</span></Label>
                <div className="relative">
                    <IdCard className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input value={data.nik} onChange={(e) => setData('nik' as keyof T, e.target.value)}
                        placeholder="Nomor Induk Karyawan / NRPP" className="h-10 pl-9 tracking-widest" inputMode="numeric" required />
                </div>
                {errors.nik && <p className="text-destructive text-xs">{errors.nik as string}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                    Email <span className="text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input type="email" value={data.email} onChange={(e) => setData('email' as keyof T, e.target.value)}
                        placeholder="Kosongkan jika tidak ada" className="h-10 pl-9" />
                </div>
                {errors.email && <p className="text-destructive text-xs">{errors.email as string}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                    {isEdit ? 'Password Baru' : 'Password'}{' '}
                    {isEdit
                        ? <span className="text-muted-foreground font-normal">(kosongkan jika tidak diubah)</span>
                        : <span className="text-destructive">*</span>
                    }
                </Label>
                <div className="relative">
                    <Input type={showPwd ? 'text' : 'password'} value={data.password}
                        onChange={(e) => setData('password' as keyof T, e.target.value)}
                        placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'} className="h-10 pr-10"
                        required={!isEdit} />
                    <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password as string}</p>}
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Role & Jabatan</p>

            <RoleSelect value={data.role} onChange={(v) => setData('role' as keyof T, v)} error={errors.role as string | undefined} />

            {needsProfile && (
                <>
                    <JabatanSelect value={data.jabatan} onChange={(v) => setData('jabatan' as keyof T, v)} error={errors.jabatan as string | undefined} />

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Departemen <span className="text-destructive">*</span></Label>
                        <Select value={data.department || ''} onValueChange={(v) => setData('department' as keyof T, v)}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Pilih departemen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['Management', 'Production', 'Maintenance', 'Supply Chain', 'Engineering', 'HSE', 'HRGA'].map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.department && <p className="text-destructive text-xs">{errors.department as string}</p>}
                    </div>
                </>
            )}

            {isDriver && (
                <>
                    <Separator />
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Konfigurasi Driver</p>

                    <JenisUnitSelect
                        value={data.jenis_unit}
                        onChange={(v) => setData('jenis_unit' as keyof T, v)}
                        error={errors.jenis_unit as string | undefined}
                    />

                    <AssignedUnitsSelect
                        units={units}
                        selected={data.assigned_unit_ids}
                        onChange={(ids) => setData('assigned_unit_ids' as keyof T, ids)}
                        error={errors.assigned_unit_ids as string | undefined}
                    />
                </>
            )}
        </>
    );
}

/* ─────────────────── AddUserSheet ───────────────────────────── */
function AddUserSheet({ open, onOpenChange, units }: { open: boolean; onOpenChange: (o: boolean) => void; units: UnitOption[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', nik: '', email: '', password: '', role: '',
        jabatan: '', department: '', jenis_unit: '', assigned_unit_ids: [] as number[],
    });

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
                    <SheetDescription>Buat akun user dengan role dan jabatan yang sesuai.</SheetDescription>
                </SheetHeader>
                <form id="user-add-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <UserFormFields data={data} setData={setData} errors={errors} units={units} />
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
function EditUserSheet({ user, open, onOpenChange, units }: { user: UserRow | null; open: boolean; onOpenChange: (o: boolean) => void; units: UnitOption[] }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: user?.name ?? '',
        nik: user?.nik ?? '',
        email: user?.email ?? '',
        password: '',
        role: (userRole(user) ?? 'driver') as string,
        jabatan: user?.jabatan ?? '',
        department: user?.department ?? '',
        jenis_unit: user?.jenis_unit ?? '',
        assigned_unit_ids: user?.units?.map((u) => u.id) ?? [] as number[],
    });

    useEffect(() => {
        if (user) {
            setData({
                name: user.name,
                nik: user.nik ?? '',
                email: user.email ?? '',
                password: '',
                role: (userRole(user) ?? 'driver') as string,
                jabatan: user.jabatan ?? '',
                department: user.department ?? '',
                jenis_unit: user.jenis_unit ?? '',
                assigned_unit_ids: user.units?.map((u) => u.id) ?? [],
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

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
                            <p className="text-muted-foreground text-xs">{user.email || '—'}</p>
                        </div>
                    </div>
                    <SheetTitle>Edit User</SheetTitle>
                    <SheetDescription>Perbarui data akun, role, jabatan, dan profil user.</SheetDescription>
                </SheetHeader>
                <form id="user-edit-form" onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <UserFormFields data={data} setData={setData} errors={errors} units={units} isEdit />
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

/* ─────────────── BatchDeleteDialog ─────────────────────────── */
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
        router.delete('/users/batch', {
            data: { ids },
            onSuccess: () => { onSuccess(); onOpenChange(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <DialogTitle className="text-center">Hapus {count} User?</DialogTitle>
                    <DialogDescription className="text-center">
                        <span className="font-semibold text-foreground">{count} user</span> yang dipilih akan dihapus permanen.
                        Akun Anda sendiri dan akun admin tidak akan dihapus meskipun dipilih.
                        Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
                    <Button variant="destructive" onClick={confirm} disabled={processing} className="flex-1">
                        {processing ? 'Menghapus...' : `Hapus ${count} User`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
        router.post('/users/import', formData, {
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
                        Import User dari Excel
                    </SheetTitle>
                    <SheetDescription>
                        Upload file Excel (.xlsx/.xls) sesuai format template. Baris yang error akan dilaporkan dan dilewati.
                    </SheetDescription>
                </SheetHeader>

                <form id="import-form" onSubmit={submit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
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
                            <li>Role valid: <code className="bg-muted px-1 rounded">admin</code>, <code className="bg-muted px-1 rounded">manager</code>, <code className="bg-muted px-1 rounded">driver</code></li>
                            <li>Email bersifat opsional</li>
                            <li>NIK harus unik di seluruh sistem</li>
                        </ul>
                    </div>

                    <a href="/users/import-template" className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline">
                        <Download className="h-4 w-4" />
                        Download Template Excel
                    </a>
                </form>

                <SheetFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
                    <Button type="submit" form="import-form" disabled={!file || processing} className="flex-1">
                        {processing ? 'Mengimport...' : 'Import Sekarang'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
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
export default function UsersIndex({ users, filters, stats, units }: Props) {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;
    const currentUserId = auth.user.id;

    const [search, setSearch] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState(filters.role ?? '');
    const [jabatanFilter, setJabatanFilter] = useState(filters.jabatan ?? '');
    const [perPage, setPerPage] = useState(filters.per_page ?? '15');
    const [addOpen, setAddOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserRow | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

    // Rows that can be selected (exclude self)
    const selectableIds = users.data.filter((u) => u.id !== currentUserId).map((u) => u.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const toggleAll = () => {
        setSelectedIds(allSelected ? [] : selectableIds);
    };
    const toggleOne = (id: number) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    const clearSelection = () => setSelectedIds([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyFilters = useCallback((s: string, r: string, j: string, pp: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/users', { search: s, role: r, jabatan: j, per_page: pp }, { preserveState: true, replace: true });
        }, 350);
    }, []);

    const handleSearch = (val: string) => { setSearch(val); applyFilters(val, roleFilter, jabatanFilter, perPage); };
    const handleRole = (r: string) => {
        const next = roleFilter === r ? '' : r;
        setRoleFilter(next);
        applyFilters(search, next, jabatanFilter, perPage);
    };
    const handleJabatan = (j: string) => {
        const next = jabatanFilter === j ? '' : j;
        setJabatanFilter(next);
        applyFilters(search, roleFilter, next, perPage);
    };
    const handlePerPage = (pp: string) => {
        setPerPage(pp);
        router.get('/users', { search, role: roleFilter, jabatan: jabatanFilter, per_page: pp }, { preserveState: true, replace: true });
    };
    const resetFilters = () => {
        setSearch(''); setRoleFilter(''); setJabatanFilter(''); setPerPage('15');
        router.get('/users', {}, { preserveState: false });
    };

    const hasFilters = search || roleFilter || jabatanFilter;

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
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
                                    <Upload className="h-4 w-4" /> Import
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Import user dari file Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a href="/users/export">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Download className="h-4 w-4" /> Export Excel
                                    </Button>
                                </a>
                            </TooltipTrigger>
                            <TooltipContent>Download daftar user ke Excel</TooltipContent>
                        </Tooltip>
                        <Button onClick={() => setAddOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Tambah User
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
                                <span className="text-destructive font-semibold">{selectedIds.length}</span> user dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 gap-1.5 text-muted-foreground">
                                <X className="h-3.5 w-3.5" /> Batalkan
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBatchDeleteOpen(true)}
                                className="h-8 gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus {selectedIds.length} User
                            </Button>
                        </div>
                    </div>
                )}

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

                        <div className="flex flex-wrap items-center gap-1.5">
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

                        <Separator orientation="vertical" className="hidden h-7 sm:block" />

                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-muted-foreground text-xs font-medium">Jabatan:</span>
                            {JABATAN_LIST.map((j) => (
                                <button key={j} onClick={() => handleJabatan(j)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                        jabatanFilter === j
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-primary/60'
                                    }`}>
                                    {j}
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
                                        <TableHead className="w-10 pl-4">
                                            <Checkbox
                                                checked={allSelected}
                                                ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                                                onCheckedChange={toggleAll}
                                                aria-label="Pilih semua"
                                                disabled={selectableIds.length === 0}
                                            />
                                        </TableHead>
                                        <TableHead className="w-10 text-center hidden sm:table-cell">#</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead className="hidden sm:table-cell">NIK / NRPP</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="hidden md:table-cell">Jabatan</TableHead>
                                        <TableHead className="hidden lg:table-cell">Departemen</TableHead>
                                        <TableHead className="w-14 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6}>
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
                                            <TableRow
                                                key={u.id}
                                                className={`group ${selectedIds.includes(u.id) ? 'bg-destructive/5' : ''}`}
                                            >
                                                <TableCell className="pl-4 w-10">
                                                    {u.id !== currentUserId ? (
                                                        <Checkbox
                                                            checked={selectedIds.includes(u.id)}
                                                            onCheckedChange={() => toggleOne(u.id)}
                                                            aria-label={`Pilih ${u.name}`}
                                                        />
                                                    ) : (
                                                        <span className="block w-4" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-center text-sm hidden sm:table-cell">
                                                    {(users.from ?? 1) + idx}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Avatar className={`h-8 w-8 shrink-0 ${avatarColor(u.name)}`}>
                                                            <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(u.name)}`}>
                                                                {getInitials(u.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm leading-tight truncate">{u.name}</p>
                                                            <p className="text-muted-foreground text-xs font-mono sm:hidden truncate">
                                                                {u.nik ?? '—'}
                                                            </p>
                                                            {u.id === currentUserId && (
                                                                <span className="text-[10px] text-muted-foreground">(Anda)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="hidden sm:table-cell">
                                                    <span className="font-mono text-sm">{u.nik ?? '—'}</span>
                                                </TableCell>

                                                <TableCell>
                                                    <RoleBadge role={userRole(u)} />
                                                </TableCell>

                                                <TableCell className="hidden md:table-cell">
                                                    <JabatanBadge jabatan={u.jabatan} />
                                                </TableCell>

                                                <TableCell className="hidden text-sm lg:table-cell">
                                                    {u.department ? (
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                {u.department}
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm"
                                                                aria-label="Aksi"
                                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem onClick={() => setTimeout(() => setEditUser(u), 0)} className="gap-2">
                                                                <Pencil className="h-4 w-4" /> Edit User
                                                            </DropdownMenuItem>
                                                            {u.id !== currentUserId && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setTimeout(() => setDeleteUser(u), 0)}
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

                        {/* Pagination footer */}
                        {users.total > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                                {/* Left: info + per-page selector */}
                                <div className="flex items-center gap-3">
                                    <p className="text-muted-foreground text-sm">
                                        {perPage === 'all'
                                            ? <>Menampilkan semua <span className="font-medium">{users.total}</span> user</>
                                            : <>Menampilkan <span className="font-medium">{users.from}</span>–<span className="font-medium">{users.to}</span> dari <span className="font-medium">{users.total}</span> user</>
                                        }
                                    </p>
                                    <Select value={perPage} onValueChange={handlePerPage}>
                                        <SelectTrigger className="h-8 w-32 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent side="top" position="popper">
                                            <SelectItem value="15">15 per halaman</SelectItem>
                                            <SelectItem value="50">50 per halaman</SelectItem>
                                            <SelectItem value="100">100 per halaman</SelectItem>
                                            <SelectItem value="all">Tampilkan semua</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Right: page buttons (hidden when show-all) */}
                                {users.last_page > 1 && perPage !== 'all' && (
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="sm" disabled={users.current_page === 1}
                                            onClick={() => router.get('/users', { ...filters, per_page: perPage, page: users.current_page - 1 })}
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
                                                        onClick={() => router.get('/users', { ...filters, per_page: perPage, page: p })}
                                                        className="h-8 w-8 p-0">
                                                        {p}
                                                    </Button>
                                                )
                                            )}
                                        <Button variant="outline" size="sm" disabled={users.current_page === users.last_page}
                                            onClick={() => router.get('/users', { ...filters, per_page: perPage, page: users.current_page + 1 })}
                                            className="h-8 gap-1">
                                            Next <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AddUserSheet open={addOpen} onOpenChange={setAddOpen} units={units} />
            <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
            <EditUserSheet user={editUser} open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }} key={editUser?.id ?? 'none'} units={units} />
            <DeleteDialog user={deleteUser} open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }} />
            <BatchDeleteDialog ids={selectedIds} open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen} onSuccess={clearSelection} />
        </TooltipProvider>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Manajemen User', href: '/users' }],
};
