/**
 * Antrean P2H offline (docs/11-pwa-offline.md §Antrean).
 * Kiriman disimpan di IndexedDB (foto sebagai Blob) lalu dikirim ulang ke POST /p2h
 * saat online. Server idempoten lewat client_uuid, jadi kirim ulang aman.
 */

export type OutboxStatus = 'queued' | 'sending' | 'failed';

export interface OutboxPart {
    key: string;
    value: string | Blob;
    filename?: string;
}

export interface OutboxRecord {
    client_uuid: string;
    user_id: number;
    unit_label: string;
    layak: boolean;
    created_at: string;
    parts: OutboxPart[];
    status: OutboxStatus;
    attempts: number;
    next_try_at: number;
    error?: string;
}

export const OUTBOX_EVENT = 'pims:outbox-changed';
const DB_NAME = 'pims-offline';
const STORE = 'outbox';
const MAX_ATTEMPTS = 5;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: 'client_uuid' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const db = await openDb();

    return new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }).finally(() => db.close());
}

function notify() {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function newClientUuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    // Fallback konteks non-HTTPS (dev via IP LAN)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;

        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function leaf(key: string, value: unknown): OutboxPart[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (value instanceof Blob) {
        return [
            {
                key,
                value,
                filename: value instanceof File ? value.name : 'blob',
            },
        ];
    }

    if (typeof value === 'boolean') {
        return [{ key, value: value ? '1' : '0' }];
    }

    return [{ key, value: String(value) }];
}

/** Ratakan objek payload ke pasangan FormData, setara konversi Inertia. */
export function toParts(
    data: Record<string, unknown>,
    prefix = '',
): OutboxPart[] {
    const parts: OutboxPart[] = [];

    for (const [rawKey, value] of Object.entries(data)) {
        const key = prefix ? `${prefix}[${rawKey}]` : rawKey;

        if (Array.isArray(value)) {
            value.forEach((item, i) => {
                // Kunci "x[]" sudah berbentuk daftar: ulangi kunci yang sama
                const itemKey = key.endsWith('[]') ? key : `${key}[${i}]`;
                const isObject =
                    typeof item === 'object' &&
                    item !== null &&
                    !(item instanceof Blob);

                parts.push(
                    ...(isObject
                        ? toParts(item as Record<string, unknown>, itemKey)
                        : leaf(itemKey, item)),
                );
            });
        } else if (
            typeof value === 'object' &&
            value !== null &&
            !(value instanceof Blob)
        ) {
            parts.push(...toParts(value as Record<string, unknown>, key));
        } else {
            parts.push(...leaf(key, value));
        }
    }

    return parts;
}

export async function listOutbox(userId?: number): Promise<OutboxRecord[]> {
    if (typeof indexedDB === 'undefined') {
        return [];
    }

    const all = await tx<OutboxRecord[]>('readonly', (s) => s.getAll());

    return all
        .filter((r) => userId === undefined || r.user_id === userId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function enqueue(
    record: Omit<OutboxRecord, 'status' | 'attempts' | 'next_try_at'>,
): Promise<void> {
    await tx('readwrite', (s) =>
        s.put({ ...record, status: 'queued', attempts: 0, next_try_at: 0 }),
    );
    notify();
}

export async function removeFromOutbox(clientUuid: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(clientUuid));
    notify();
}

async function save(record: OutboxRecord) {
    await tx('readwrite', (s) => s.put(record));
    notify();
}

/** "Coba lagi" pada kiriman gagal: reset hitungan percobaan. */
export async function retryOutbox(clientUuid: string): Promise<void> {
    const record = await tx<OutboxRecord | undefined>('readonly', (s) =>
        s.get(clientUuid),
    );

    if (record) {
        await save({
            ...record,
            status: 'queued',
            attempts: 0,
            next_try_at: 0,
            error: undefined,
        });
    }
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

function firstError(body: unknown): string {
    const errors = (body as { errors?: Record<string, string[]> } | null)
        ?.errors;
    const first = errors ? Object.values(errors)[0]?.[0] : undefined;

    return (
        first ??
        (body as { message?: string } | null)?.message ??
        'Data P2H ditolak server.'
    );
}

export type FlushResult = { sent: OutboxRecord[]; rejected: OutboxRecord[] };

let flushing = false;

/** Kirim semua antrean milik userId. Aman dipanggil berulang (dikunci). */
export async function flushOutbox(userId: number): Promise<FlushResult> {
    const result: FlushResult = { sent: [], rejected: [] };

    if (flushing || !navigator.onLine) {
        return result;
    }

    flushing = true;

    try {
        for (const record of await listOutbox(userId)) {
            if (record.status === 'failed' || record.next_try_at > Date.now()) {
                continue;
            }

            await save({ ...record, status: 'sending' });
            const body = new FormData();
            record.parts.forEach((p) =>
                typeof p.value === 'string'
                    ? body.append(p.key, p.value)
                    : body.append(p.key, p.value, p.filename),
            );

            let response: Response | null = null;

            try {
                response = await fetch('/p2h', {
                    method: 'POST',
                    body,
                    credentials: 'same-origin',
                    redirect: 'manual',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                });
            } catch {
                response = null; // jaringan putus — coba lagi nanti
            }

            // Sukses = redirect ke layar "P2H terkirim" (termasuk kirim ulang uuid sama)
            if (
                response &&
                (response.type === 'opaqueredirect' || response.ok)
            ) {
                await removeFromOutbox(record.client_uuid);
                result.sent.push(record);
                continue;
            }

            // 422 validasi / 403 tidak berhak atas unit: tidak akan berhasil bila diulang
            if (response?.status === 422 || response?.status === 403) {
                const failed: OutboxRecord = {
                    ...record,
                    status: 'failed',
                    error: firstError(await response.json().catch(() => null)),
                };
                await save(failed);
                result.rejected.push(failed);
                continue;
            }

            // 401/419 (sesi habis), 5xx, atau jaringan: backoff eksponensial, maks 5×
            const sessionExpired =
                response?.status === 401 || response?.status === 419;
            const attempts = sessionExpired
                ? record.attempts
                : record.attempts + 1;
            await save({
                ...record,
                status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
                attempts,
                next_try_at:
                    Date.now() + Math.min(2 ** attempts * 15_000, 10 * 60_000),
                error: sessionExpired
                    ? 'Sesi berakhir. Masuk lagi untuk mengirim antrean.'
                    : 'Gagal mengirim. Akan dicoba lagi otomatis.',
            });

            if (!response || sessionExpired) {
                break; // offline / sesi habis — hentikan putaran ini
            }
        }
    } finally {
        flushing = false;
    }

    return result;
}
