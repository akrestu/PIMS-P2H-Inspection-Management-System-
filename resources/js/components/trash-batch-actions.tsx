import { router } from '@inertiajs/react';
import { AlertTriangle, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/** Pilihan baris pada satu halaman tabel; dikosongkan saat data halaman berganti. */
export function useRowSelection(ids: number[]) {
    const key = ids.join(',');
    // Pilihan disimpan bersama kunci halaman; kunci berbeda → pilihan dianggap kosong
    const [state, setState] = useState<{ key: string; ids: number[] }>({
        key,
        ids: [],
    });
    const selected = state.key === key ? state.ids : [];
    const setSelected = (next: number[]) => setState({ key, ids: next });

    const allSelected = ids.length > 0 && selected.length === ids.length;

    return {
        selected,
        allSelected,
        someSelected: selected.length > 0 && !allSelected,
        isSelected: (id: number) => selected.includes(id),
        toggle: (id: number) =>
            setSelected(
                selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id],
            ),
        toggleAll: () => setSelected(allSelected ? [] : ids),
        clear: () => setSelected([]),
    };
}

type Action = 'restore' | 'force';

/**
 * Toolbar aksi massal untuk halaman Sampah: pulihkan atau hapus permanen
 * (khusus admin) item yang dipilih, dengan dialog konfirmasi.
 */
export function TrashBatchActions({
    selected,
    noun,
    restoreUrl,
    forceDeleteUrl,
    canForceDelete,
    forceDeleteNote,
    onClear,
}: {
    selected: number[];
    noun: string;
    restoreUrl: string;
    forceDeleteUrl: string;
    canForceDelete: boolean;
    forceDeleteNote: string;
    onClear: () => void;
}) {
    const [action, setAction] = useState<Action | null>(null);
    const [processing, setProcessing] = useState(false);
    const count = selected.length;

    if (count === 0) {
        return null;
    }

    const confirm = () => {
        const options = {
            preserveScroll: true,
            onSuccess: onClear,
            onFinish: () => {
                setProcessing(false);
                setAction(null);
            },
        };

        setProcessing(true);

        if (action === 'restore') {
            router.post(restoreUrl, { ids: selected }, options);
        } else {
            router.delete(forceDeleteUrl, {
                data: { ids: selected },
                ...options,
            });
        }
    };

    const isForce = action === 'force';

    return (
        <>
            <div
                role="region"
                aria-label="Aksi massal"
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2"
            >
                <span className="text-sm font-medium">
                    {count} {noun} dipilih
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-muted-foreground"
                    onClick={onClear}
                >
                    <X className="h-3.5 w-3.5" />
                    Batal pilih
                </Button>
                <div className="ml-auto flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setAction('restore')}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Pulihkan ({count})
                    </Button>
                    {canForceDelete && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setAction('force')}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus permanen ({count})
                        </Button>
                    )}
                </div>
            </div>

            <Dialog
                open={action !== null}
                onOpenChange={(open) => !open && !processing && setAction(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <div
                            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isForce ? 'bg-destructive/10' : 'bg-primary/10'}`}
                        >
                            {isForce ? (
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            ) : (
                                <RotateCcw className="h-6 w-6 text-primary" />
                            )}
                        </div>
                        <DialogTitle className="text-center">
                            {isForce
                                ? `Hapus permanen ${count} ${noun}?`
                                : `Pulihkan ${count} ${noun}?`}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {isForce ? (
                                <>
                                    {forceDeleteNote} Tindakan ini{' '}
                                    <span className="font-semibold text-destructive">
                                        tidak dapat dibatalkan
                                    </span>
                                    .
                                </>
                            ) : (
                                `${count} ${noun} yang dipilih akan dikembalikan ke daftar aktif.`
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setAction(null)}
                            disabled={processing}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            variant={isForce ? 'destructive' : 'default'}
                            onClick={confirm}
                            disabled={processing}
                            className="flex-1"
                        >
                            {processing
                                ? 'Memproses...'
                                : isForce
                                  ? 'Hapus Permanen'
                                  : 'Pulihkan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
