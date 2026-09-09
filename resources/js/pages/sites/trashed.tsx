import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Site } from '@/types/pims';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, MapPin, RotateCcw, Search, Trash, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface TrashedSite extends Site {
    deleted_at: string;
}

interface PaginatedData {
    data: TrashedSite[];
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
    sites: PaginatedData;
    filters: Filters;
}

function RestoreDialog({ site, open, onOpenChange }: { site: TrashedSite | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (!site) return;
        setProcessing(true);
        router.post(`/sites/${site.id}/restore`, {}, {
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
                    <DialogTitle className="text-center">Pulihkan Site?</DialogTitle>
                    <DialogDescription className="text-center">
                        Site <span className="text-foreground font-semibold">{site?.name}</span> akan dikembalikan ke daftar site aktif.
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

function ForceDeleteDialog({ site, open, onOpenChange }: { site: TrashedSite | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (!site) return;
        setProcessing(true);
        router.delete(`/sites/${site.id}/force`, {
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
                        Site <span className="text-foreground font-semibold">{site?.name}</span> akan dihapus permanen dari sistem.
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

export default function SitesTrashed({ sites, filters }: Props) {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>().props;
    const roles = auth?.user?.roles ?? [];
    const isAdmin = roles.includes('admin');

    const [search, setSearch] = useState(filters.search ?? '');
    const [restoreSite, setRestoreSite] = useState<TrashedSite | null>(null);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [forceDeleteSite, setForceDeleteSite] = useState<TrashedSite | null>(null);
    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearch = useCallback((val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get('/sites/trashed', { search: val }, { preserveState: true, replace: true });
        }, 350);
    }, []);

    return (
        <TooltipProvider>
            <Head title="Sampah Site" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <a href="/sites">
                                <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
                                    <ArrowLeft className="h-4 w-4" /> Kembali
                                </Button>
                            </a>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Sampah Site</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            Site yang telah dihapus. Pulihkan kembali atau hapus permanen.
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
                                placeholder="Cari nama site..."
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
                                        <TableHead>Nama Site</TableHead>
                                        <TableHead>Dihapus Pada</TableHead>
                                        <TableHead className="w-40 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                                    <div className="bg-muted rounded-full p-4">
                                                        <Trash className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Sampah kosong</p>
                                                        <p className="text-muted-foreground mt-1 text-sm">Tidak ada site yang dihapus.</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sites.data.map((site) => (
                                            <TableRow key={site.id}>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        {site.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {new Date(site.deleted_at).toLocaleString('id-ID')}
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
                                                                    onClick={() => { setRestoreSite(site); setRestoreOpen(true); }}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Kembalikan site ke daftar aktif</TooltipContent>
                                                        </Tooltip>
                                                        {isAdmin && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={() => { setForceDeleteSite(site); setForceDeleteOpen(true); }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Hapus permanen</TooltipContent>
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

                        {sites.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Menampilkan <span className="font-medium">{sites.from}</span>–<span className="font-medium">{sites.to}</span> dari{' '}
                                    <span className="font-medium">{sites.total}</span> site
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={sites.current_page === 1}
                                        onClick={() => router.get('/sites/trashed', { ...filters, page: sites.current_page - 1 })}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={sites.current_page === sites.last_page}
                                        onClick={() => router.get('/sites/trashed', { ...filters, page: sites.current_page + 1 })}
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
                site={restoreSite}
                open={restoreOpen}
                onOpenChange={(o) => { setRestoreOpen(o); if (!o) setRestoreSite(null); }}
            />
            <ForceDeleteDialog
                site={forceDeleteSite}
                open={forceDeleteOpen}
                onOpenChange={(o) => { setForceDeleteOpen(o); if (!o) setForceDeleteSite(null); }}
            />
        </TooltipProvider>
    );
}

SitesTrashed.layout = {
    breadcrumbs: [
        { title: 'Site', href: '/sites' },
        { title: 'Sampah', href: '/sites/trashed' },
    ],
};
