import { Link, usePage } from '@inertiajs/react';
import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveDrawer } from '@/components/pims/responsive-drawer';
import { ErrorState } from '@/components/pims/states';
import type { StatusKey } from '@/components/pims/status-pill';
import { KritisTag, StatusPill } from '@/components/pims/status-pill';
import { Button } from '@/components/ui/button';
import { formatDate, formatHM, formatTime } from '@/lib/format';
import type { P2hSession, P2hUserEntry } from '@/types/pims';

/**
 * Detail sesi P2H sebagai drawer kanan di desktop (docs/screens/driver.md · Riwayat).
 * Data diambil dari halaman /p2h/{id} yang sama (protokol JSON Inertia) — tanpa endpoint baru.
 */
type State =
    | { kind: 'loading' }
    | { kind: 'error'; code?: number }
    | { kind: 'ready'; session: P2hSession };

const APPROVAL: Record<string, StatusKey> = {
    pending: 'menunggu',
    approved: 'disetujui',
    rejected: 'ditolak',
};

const shiftLabel = (shift?: string | null) =>
    shift
        ? shift.replace('Shift II', 'Shift 2').replace('Shift I', 'Shift 1')
        : '—';

function EntryCard({ entry, index }: { entry: P2hUserEntry; index: number }) {
    const rusak = (entry.answers ?? []).filter(
        (a) => a.kondisi === 'Tidak Layak',
    );

    return (
        <section className="space-y-3 rounded-xl border-(length:--bw) bg-card p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold">{entry.user?.name ?? '—'}</p>
                    <p className="text-[13px] text-muted-foreground">
                        Entry {index + 1} · {shiftLabel(entry.shift)}
                        {entry.submitted_at &&
                            ` · ${formatTime(entry.submitted_at)}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {entry.kondisi_akhir && (
                        <StatusPill
                            status={
                                entry.kondisi_akhir === 'BD'
                                    ? 'tidak-layak'
                                    : 'layak'
                            }
                        />
                    )}
                    {entry.approval_status &&
                        APPROVAL[entry.approval_status] && (
                            <StatusPill
                                status={APPROVAL[entry.approval_status]}
                            />
                        )}
                </div>
            </header>

            <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                    <dt className="text-xs text-muted-foreground">
                        HM/KM awal
                    </dt>
                    <dd className="font-medium">
                        {entry.km_awal ? formatHM(entry.km_awal) : '—'}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        HM/KM akhir
                    </dt>
                    <dd className="font-medium">
                        {entry.hm_km_akhir ? formatHM(entry.hm_km_akhir) : '—'}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Checklist</dt>
                    <dd
                        className={
                            rusak.length > 0
                                ? 'font-medium text-danger'
                                : 'font-medium'
                        }
                    >
                        {rusak.length > 0
                            ? `${rusak.length} Tidak Layak`
                            : 'Semua layak'}
                    </dd>
                </div>
            </dl>

            {rusak.length > 0 && (
                <ul className="space-y-2 border-t pt-3">
                    {rusak.map((a) => (
                        <li key={a.id} className="text-sm">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                                {a.inspection_item?.nama_item ?? 'Item'}
                                {a.inspection_item?.kode_bahaya === 'AA' && (
                                    <KritisTag />
                                )}
                            </span>
                            {a.keterangan && (
                                <span className="text-muted-foreground">
                                    {a.keterangan}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {entry.justifikasi_kondisi && (
                <p className="border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Justifikasi: </span>
                    {entry.justifikasi_kondisi}
                </p>
            )}
            {entry.catatan_approval && (
                <p className="text-sm">
                    <span className="text-muted-foreground">
                        Catatan persetujuan:{' '}
                    </span>
                    {entry.catatan_approval}
                </p>
            )}
        </section>
    );
}

export function SessionDrawer({
    sessionId,
    onClose,
}: {
    sessionId: number | null;
    onClose: () => void;
}) {
    const { version } = usePage();
    const [state, setState] = useState<State>({ kind: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (sessionId === null) {
            return;
        }

        const controller = new AbortController();

        fetch(`/p2h/${sessionId}`, {
            signal: controller.signal,
            headers: {
                'X-Inertia': 'true',
                'X-Inertia-Version': version ?? '',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'text/html, application/xhtml+xml',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    setState({ kind: 'error', code: res.status });

                    return;
                }

                const page = (await res.json()) as {
                    props: { session: P2hSession };
                };
                setState({ kind: 'ready', session: page.props.session });
            })
            .catch((e: unknown) => {
                if (!(e instanceof DOMException && e.name === 'AbortError')) {
                    setState({ kind: 'error' });
                }
            });

        return () => {
            controller.abort();
            setState({ kind: 'loading' });
        };
    }, [sessionId, version, attempt]);

    const session = state.kind === 'ready' ? state.session : null;
    const entries = session?.user_entries ?? [];

    return (
        <ResponsiveDrawer
            open={sessionId !== null}
            onOpenChange={(open) => !open && onClose()}
            width="lg"
            title={
                session
                    ? `${session.unit?.no_unit ?? 'Unit'} · ${formatDate(session.tanggal)}`
                    : 'Detail sesi P2H'
            }
            description={
                session
                    ? [
                          session.unit?.jenis_unit,
                          session.job_site,
                          `${entries.length} entry`,
                      ]
                          .filter(Boolean)
                          .join(' · ')
                    : undefined
            }
            footer={
                sessionId !== null && (
                    <>
                        <Button asChild variant="outline">
                            <a
                                href={`/p2h/${sessionId}/export-pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Download />
                                Unduh PDF sesi
                            </a>
                        </Button>
                        <Button asChild>
                            <Link href={`/p2h/${sessionId}`}>
                                <ExternalLink />
                                Detail lengkap
                            </Link>
                        </Button>
                    </>
                )
            }
        >
            {state.kind === 'loading' && (
                <div className="space-y-3" aria-busy>
                    <div className="h-28 skeleton" />
                    <div className="h-28 skeleton" />
                </div>
            )}
            {state.kind === 'error' && (
                <ErrorState
                    code={state.code}
                    onRetry={() => setAttempt((n) => n + 1)}
                />
            )}
            {session && (
                <div className="space-y-3">
                    {entries.length > 1 && (
                        <p className="rounded-xl bg-info-soft px-3 py-2 text-[13px]">
                            Unit ini diisi oleh {entries.length} driver pada
                            hari yang sama. Setiap entry disetujui terpisah.
                        </p>
                    )}
                    {entries.map((entry, i) => (
                        <EntryCard key={entry.id} entry={entry} index={i} />
                    ))}
                    {session.catatan_khusus && (
                        <p className="text-sm">
                            <span className="text-muted-foreground">
                                Catatan khusus:{' '}
                            </span>
                            {session.catatan_khusus}
                        </p>
                    )}
                </div>
            )}
        </ResponsiveDrawer>
    );
}
