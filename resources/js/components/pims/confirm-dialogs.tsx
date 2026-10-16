import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const CONFIRM_WORD = 'HAPUS';

/**
 * ConfirmTypeDelete (docs/02, 08#7): hapus permanen — tombol aktif bila
 * pengguna mengetik `HAPUS`. Hanya untuk Admin (cek di server).
 */
export function ConfirmTypeDelete({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    processing = false,
    confirmLabel = 'Hapus permanen',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    onConfirm: () => void;
    processing?: boolean;
    confirmLabel?: string;
}) {
    const [typed, setTyped] = useState('');
    const inputId = useId();
    const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

    return (
        <AlertDialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    setTyped('');
                }

                onOpenChange(v);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description ??
                            'Data akan dihapus selamanya dan tidak bisa dipulihkan.'}{' '}
                        Ketik{' '}
                        <strong className="font-mono">{CONFIRM_WORD}</strong>{' '}
                        untuk konfirmasi.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <label htmlFor={inputId} className="sr-only">
                    Ketik {CONFIRM_WORD}
                </label>
                <Input
                    id={inputId}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder={CONFIRM_WORD}
                    className="font-mono tracking-widest"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <Button
                        variant="destructive"
                        disabled={!ready}
                        loading={processing}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * ReasonDialog (docs/02, 08#4/#7): chip alasan cepat + textarea, wajib.
 * Dipakai untuk tolak P2H, hapus sesi/entry.
 */
export function ReasonDialog({
    open,
    onOpenChange,
    title,
    description,
    quickReasons = [],
    minLength = 10,
    confirmLabel,
    destructive = true,
    processing = false,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    quickReasons?: string[];
    minLength?: number;
    confirmLabel: string;
    destructive?: boolean;
    processing?: boolean;
    onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState('');
    const [touched, setTouched] = useState(false);
    const fieldId = useId();
    const errorId = useId();
    const tooShort = reason.trim().length < minLength;
    const showError = touched && tooShort;

    const submit = () => {
        setTouched(true);

        if (!tooShort) {
            onConfirm(reason.trim());
        }
    };

    return (
        <AlertDialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    setReason('');
                    setTouched(false);
                }

                onOpenChange(v);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && (
                        <AlertDialogDescription>
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                {quickReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {quickReasons.map((r) => (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={reason === r}
                                onClick={() => setReason(r)}
                                className={cn(
                                    'h-9 press rounded-full border-(length:--bw) px-3 text-[13px] font-medium',
                                    reason === r
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-input hover:bg-muted',
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                )}
                <div className="space-y-1.5">
                    <label htmlFor={fieldId} className="text-sm font-medium">
                        Alasan
                    </label>
                    <Textarea
                        id={fieldId}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        aria-invalid={showError || undefined}
                        aria-describedby={showError ? errorId : undefined}
                        placeholder="Tulis alasan…"
                    />
                    {showError && (
                        <p
                            id={errorId}
                            className="text-[13px] font-medium text-danger"
                        >
                            Alasan minimal {minLength} karakter.
                        </p>
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <Button
                        variant={destructive ? 'destructive' : 'default'}
                        loading={processing}
                        onClick={submit}
                    >
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
