import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Unit } from '@/types/pims';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Bus, Car, ChevronLeft, ChevronRight, RotateCcw, Search, Trash, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface TrashedUnit extends Unit {
    deleted_at: string;
}

interface PaginatedData {
    data: TrashedUnit[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search?: string;
}

interface Props {
    units: PaginatedData;
    filters: Filters;
}

function RestoreDialog({ unit, open, onOpenChange }: { unit: TrashedUnit | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (!unit) return;
        setProcessing(true);
        router.post(`/units/${unit.id}/restore`, {}, {
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
                    <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                        <RotateCcw className="text-primary h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center">Pulihkan Unit?</DialogTitle>
                    <DialogDescription className="text-center">
                        Unit <span className="text-foreground font-semibold">{unit?.no_unit}</span> akan dikembalikan ke daftar unit aktif.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
                    <Button onClick={confirm} disabled={processing} className="flex-1">
                        {processing ? 'Memulihkan...' : 'Pulihkan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ForceDeleteDialog({ unit, open, onOpenChange }: { unit: TrashedUnit | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (!unit) return;
        setProcessing(true);
        router.delete(`/units/${unit.id}/force`, {
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
                        <AlertTriangle className="text-destructive h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center">Hapus Permanen?</DialogTitle>
                    <DialogDescription className="text-center">
                        Unit <span className="text-foreground font-semibold">{unit?.no_unit}</span> beserta{' '}
                        <span className="font-semibold text-destructive">seluruh riwayat P2H yang terkait</span> akan dihapus permanen dari sistem.
                        Tindakan ini <span className="font-semibold text-destructive">tidak dapat dibatalkan</span>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
                    <Button variant="destructive" onClick={confirm} disabled={processing} className="flex-1">
                        {processing ? 'Menghapus...' : 'Hapus Permanen'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function UnitsTrashed({ units, filters }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>().props;
    const roles = auth?.user?.roles ?? [];
    const isAdmin = roles.includes('admin');

    const [search, setSearch] = useState(filters.search ?? '');
    const [restoreUnit, setRestoreUnit] = useState<TrashedUnit | null>(null);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [forceDeleteUnit, setForceDeleteUnit] = useState<TrashedUnit | null>(null);
    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearch = useCallback((val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/units/trashed', { search: val }, { preserveState: true, replace: true });
        }, 350);
    }, []);

    return (
        <TooltipProvider>
            <Head title="Sampah Unit" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <a href="/units">
                                <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
                                    <ArrowLeft className="h-4 w-4" /> Kembali
                                </Button>
                            </a>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Sampah Unit</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            Unit yang telah dihapus. Pulihkan kembali atau hapus permanen beserta riwayat P2H terkait.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardContent className="flex items-center gap-3 py-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari no. unit..."
                                className="h-9 pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>No. Unit</TableHead>
                                        <TableHead>Jenis Unit</TableHead>
                                        <TableHead>No. Polisi</TableHead>
                                        <TableHead className="hidden md:table-cell">Departemen</TableHead>
                                        <TableHead>Dihapus Pada</TableHead>
                                        <TableHead className="w-40 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="bg-muted rounded-full p-4">
                                                        <Trash className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Sampah kosong</p>
                                                        <p className="text-muted-foreground mt-1 text-sm">Tidak ada unit yang dihapus.</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        units.data.map((unit) => (
                                            <TableRow key={unit.id}>
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
                                                    {unit.department ? unit.department : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {new Date(unit.deleted_at).toLocaleString('id-ID')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 gap-1.5"
                                                                    onClick={() => { setRestoreUnit(unit); setRestoreOpen(true); }}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Kembalikan unit ke daftar aktif</TooltipContent>
                                                        </Tooltip>
                                                        {isAdmin && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={() => { setForceDeleteUnit(unit); setForceDeleteOpen(true); }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Hapus permanen beserta riwayat P2H</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

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
                                        onClick={() => router.get('/units/trashed', { ...filters, page: units.current_page - 1 })}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={units.current_page === units.last_page}
                                        onClick={() => router.get('/units/trashed', { ...filters, page: units.current_page + 1 })}
                                        className="h-8 gap-1"
                                    >
                                        Next <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <RestoreDialog
                unit={restoreUnit}
                open={restoreOpen}
                onOpenChange={(o) => { setRestoreOpen(o); if (!o) setRestoreUnit(null); }}
            />
            <ForceDeleteDialog
                unit={forceDeleteUnit}
                open={forceDeleteOpen}
                onOpenChange={(o) => { setForceDeleteOpen(o); if (!o) setForceDeleteUnit(null); }}
            />
        </TooltipProvider>
    );
}

UnitsTrashed.layout = {
    breadcrumbs: [
        { title: 'Unit', href: '/units' },
        { title: 'Sampah', href: '/units/trashed' },
    ],
};
