import { usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CloudUpload,
    Loader2,
    RotateCw,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import type { OutboxRecord } from '@/lib/offline-queue';
import {
    flushOutbox,
    listOutbox,
    OUTBOX_EVENT,
    removeFromOutbox,
    retryOutbox,
} from '@/lib/offline-queue';
import { cn } from '@/lib/utils';

const SYNC_INTERVAL_MS = 60_000;

function useAuthUserId(): number | null {
    const { auth } = usePage<{ auth: { user: { id: number } | null } }>().props;

    return auth?.user?.id ?? null;
}

/** Antrean P2H milik akun yang sedang masuk; ikut berubah saat antrean berubah. */
export function useOutbox(): OutboxRecord[] {
    const userId = useAuthUserId();
    const [records, setRecords] = useState<OutboxRecord[]>([]);

    useEffect(() => {
        if (userId === null) {
            return;
        }

        const load = () =>
            listOutbox(userId)
                .then(setRecords)
                .catch(() => setRecords([]));
        load();
        window.addEventListener(OUTBOX_EVENT, load);

        return () => window.removeEventListener(OUTBOX_EVENT, load);
    }, [userId]);

    return records;
}

/**
 * Pengirim antrean: saat aplikasi dibuka, saat sinyal kembali (event `online`),
 * dan tiap menit (docs/11 §Antrean langkah 3).
 */
export function OfflineSync() {
    const userId = useAuthUserId();

    const sync = useCallback(async () => {
        if (userId === null) {
            return;
        }

        const { sent, rejected } = await flushOutbox(userId).catch(() => ({
            sent: [] as OutboxRecord[],
            rejected: [] as OutboxRecord[],
        }));

        sent.forEach((r) =>
            toast.success(`P2H ${r.unit_label} terkirim dari antrean`),
        );
        rejected.forEach((r) =>
            toast.error(`P2H ${r.unit_label} ditolak server`, {
                description: r.error,
            }),
        );
    }, [userId]);

    useEffect(() => {
        sync();
        window.addEventListener('online', sync);
        const timer = window.setInterval(sync, SYNC_INTERVAL_MS);

        return () => {
            window.removeEventListener('online', sync);
            window.clearInterval(timer);
        };
    }, [sync]);

    return null;
}

const STATUS = {
    queued: {
        icon: CloudUpload,
        label: 'Antre',
        className: 'bg-warning-soft text-foreground',
    },
    sending: {
        icon: Loader2,
        label: 'Mengunggah',
        className: 'bg-info-soft text-foreground',
    },
    failed: {
        icon: AlertCircle,
        label: 'Gagal',
        className: 'bg-danger-soft text-danger',
    },
} as const;

function OutboxStatus({ record }: { record: OutboxRecord }) {
    const config = STATUS[record.status];
    const Icon = config.icon;

    return (
        <span
            className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                config.className,
            )}
        >
            <Icon
                className={cn(
                    'size-3.5',
                    record.status === 'sending' && 'motion-safe:animate-spin',
                )}
                aria-hidden
            />
            {config.label}
        </span>
    );
}

/** Kartu antrean di Beranda driver (docs/11 §Antrean langkah 5). */
export function OutboxCard() {
    const records = useOutbox();

    if (records.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Antrean P2H offline"
            className="rounded-xl bg-card p-[18px] shadow-sm"
        >
            <h2 className="text-[15px] font-bold">
                Antrean offline · {records.length} P2H
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
                Terkirim otomatis saat sinyal kembali.
            </p>
            <ul className="mt-3 divide-y divide-border">
                {records.map((r) => (
                    <li key={r.client_uuid} className="py-3">
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">
                                    {r.unit_label}
                                </p>
                                <p className="text-[13px] text-muted-foreground tabular-nums">
                                    Diisi {formatDateTime(r.created_at)}
                                </p>
                            </div>
                            <OutboxStatus record={r} />
                        </div>
                        {r.status === 'failed' && (
                            <div className="mt-2 space-y-2">
                                {r.error && (
                                    <p className="text-[13px] text-danger">
                                        {r.error}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            retryOutbox(r.client_uuid)
                                        }
                                    >
                                        <RotateCw aria-hidden />
                                        Coba lagi
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Hapus P2H ${r.unit_label} dari antrean? Data ini belum terkirim dan akan hilang.`,
                                                )
                                            ) {
                                                removeFromOutbox(r.client_uuid);
                                            }
                                        }}
                                    >
                                        <Trash2 aria-hidden />
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
