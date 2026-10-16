import { Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Bell,
    Check,
    ChevronRight,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusPill } from '@/components/pims/status-pill';
import type { StatusKey } from '@/components/pims/status-pill';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Satu baris dari App\Support\TodayP2hStatus::build(). */
export type TodayRow = {
    unit_id: number;
    no_unit: string;
    jenis_unit: string;
    driver: string | null;
    drivers: { name: string | null; time: string | null }[];
    p2h: 'layak' | 'tidak-layak' | 'belum' | 'tidak-wajib';
    waktu: string | null;
    tidak_layak: number;
    approval: {
        status: 'menunggu' | 'eskalasi' | 'disetujui';
        minutes: number | null;
    } | null;
    unit_status: 'ready' | 'bd' | 'pm' | 'servis';
    unit_note: string | null;
    unit_since: string | null;
    /** Nama driver yang ditugaskan ke unit (penerima "Ingatkan"). */
    assigned: string[];
    session_id: number | null;
    pending_entry_id: number | null;
};

export type TodaySummary = {
    submitted: number;
    required: number;
    layak: number;
    tidak_layak: string[];
    belum: number;
    waiting: number;
    escalated: number;
    findings_open: number;
    findings_overdue: number;
};

export type TodayFleet = {
    total: number;
    counts: Record<'ready' | 'bd' | 'pm' | 'servis', number>;
    not_ready: {
        no_unit: string;
        status: 'bd' | 'pm' | 'servis';
        note: string | null;
        since: string | null;
    }[];
};

export type TodayFilter = 'semua' | 'belum' | 'tidak-layak' | 'menunggu';

export const isWaiting = (r: TodayRow) =>
    r.approval?.status === 'menunggu' || r.approval?.status === 'eskalasi';

export function filterRows(rows: TodayRow[], filter: TodayFilter) {
    switch (filter) {
        case 'belum':
            return rows.filter((r) => r.p2h === 'belum');
        case 'tidak-layak':
            return rows.filter((r) => r.p2h === 'tidak-layak');
        case 'menunggu':
            return rows.filter(isWaiting);
        default:
            return rows;
    }
}

/** Pill hasil P2H; "Tidak Layak" memakai varian solid (docs/01). */
export function P2hResultPill({
    row,
    size = 'md',
}: {
    row: TodayRow;
    size?: 'sm' | 'md';
}) {
    if (row.p2h === 'tidak-wajib') {
        return (
            <span className="text-[13px] text-muted-foreground">
                Tidak dioperasikan
            </span>
        );
    }

    if (row.p2h === 'layak' && isWaiting(row)) {
        return (
            <StatusPill status="menunggu" label="Layak · menunggu" size={size} />
        );
    }

    const map: Record<string, { status: StatusKey; label: string }> = {
        layak: { status: 'layak', label: 'Layak Pakai' },
        'tidak-layak': { status: 'tidak-layak', label: 'Tidak Layak' },
        belum: { status: 'belum', label: 'Belum P2H' },
    };
    const meta = map[row.p2h];

    const pill = (
        <StatusPill
            status={meta.status}
            label={meta.label}
            size={size}
            solid={row.p2h === 'tidak-layak'}
        />
    );

    if (row.tidak_layak > 0) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0} className="rounded-full">
                        {pill}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {row.tidak_layak} item Tidak Layak
                </TooltipContent>
            </Tooltip>
        );
    }

    return pill;
}

export function ApprovalText({ row }: { row: TodayRow }) {
    if (!row.approval) {
        return <span className="text-muted-foreground">—</span>;
    }

    const { status, minutes } = row.approval;

    if (status === 'disetujui') {
        return <span className="text-muted-foreground">Disetujui</span>;
    }

    const late = status === 'eskalasi' || (minutes ?? 0) > 15;

    return (
        <span className={cn(late ? 'text-danger' : 'text-muted-foreground')}>
            {status === 'eskalasi' ? 'Eskalasi' : 'Menunggu'}
            {minutes !== null && ` · ${minutes} mnt`}
        </span>
    );
}

const UNIT_STATUS: Record<TodayRow['unit_status'], StatusKey> = {
    ready: 'ready',
    bd: 'bd',
    pm: 'pm',
    servis: 'servis',
};

export function UnitStatusPill({
    status,
    size = 'sm',
}: {
    status: TodayRow['unit_status'];
    size?: 'sm' | 'md';
}) {
    return <StatusPill status={UNIT_STATUS[status]} size={size} />;
}

/** Unit belum P2H yang punya driver ditugaskan → bisa diingatkan. */
export const canRemind = (r: TodayRow) =>
    r.p2h === 'belum' && r.unit_status === 'ready' && r.assigned.length > 0;

/**
 * Kirim notifikasi aplikasi "belum P2H" ke driver yang ditugaskan
 * (LiveMonitoringController::remind). Hasil ditampilkan lewat flash toast.
 */
export function sendReminder(unitIds: number[], onDone?: () => void) {
    router.post(
        '/monitoring-p2h/ingatkan',
        { unit_ids: unitIds },
        { preserveScroll: true, onFinish: () => onDone?.() },
    );
}

/** Tombol "Ingatkan" per unit; berubah jadi "Terkirim" setelah berhasil. */
export function RemindButton({ row }: { row: TodayRow }) {
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

    if (row.assigned.length === 0) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* span agar tooltip tetap muncul pada tombol nonaktif */}
                    <span tabIndex={0}>
                        <Button size="sm" variant="outline" disabled>
                            <Bell />
                            Ingatkan
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>Belum ada driver ditugaskan</TooltipContent>
            </Tooltip>
        );
    }

    if (state === 'sent') {
        return (
            <span className="inline-flex h-8 items-center gap-1 px-2 text-[13px] font-medium text-success">
                <Check className="size-4" />
                Terkirim
            </span>
        );
    }

    return (
        <Button
            size="sm"
            variant="outline"
            disabled={state === 'sending'}
            title={`Ingatkan ${row.assigned.join(', ')}`}
            onClick={() => {
                setState('sending');
                router.post(
                    '/monitoring-p2h/ingatkan',
                    { unit_ids: [row.unit_id] },
                    {
                        preserveScroll: true,
                        onSuccess: () => setState('sent'),
                        onError: () => setState('idle'),
                    },
                );
            }}
        >
            <Bell />
            Ingatkan
        </Button>
    );
}

/** Aksi kontekstual baris: Tinjau (menunggu) · Lihat (sudah P2H) · Ingatkan (belum). */
export function RowAction({ row }: { row: TodayRow }) {
    if (isWaiting(row)) {
        return (
            <Button asChild size="sm" variant="outline">
                <Link href="/p2h/approvals">Tinjau</Link>
            </Button>
        );
    }

    if (row.session_id) {
        return (
            <Button asChild size="sm" variant="outline">
                <Link href={`/p2h/${row.session_id}`}>Lihat</Link>
            </Button>
        );
    }

    if (row.p2h === 'belum' && row.unit_status === 'ready') {
        return <RemindButton row={row} />;
    }

    return null;
}

type SortKey = 'no_unit' | 'jenis_unit' | 'driver' | 'p2h' | 'waktu' | 'approval' | 'unit_status';

const P2H_ORDER = { 'tidak-layak': 0, belum: 1, layak: 2, 'tidak-wajib': 3 };

function sortValue(row: TodayRow, key: SortKey): string | number {
    switch (key) {
        case 'p2h':
            return P2H_ORDER[row.p2h];
        case 'approval':
            return row.approval?.status ?? 'zz';
        case 'waktu':
            return row.waktu ?? '99:99';
        default:
            return (row[key] ?? '').toString();
    }
}

function SortButton({
    label,
    column,
    sort,
    onSort,
}: {
    label: string;
    column: SortKey;
    sort: { key: SortKey | null; dir: 'asc' | 'desc' };
    onSort: (key: SortKey) => void;
}) {
    const active = sort.key === column;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;

    return (
        <button
            type="button"
            onClick={() => onSort(column)}
            className="inline-flex items-center gap-1 rounded font-semibold hover:text-foreground"
        >
            {label}
            <Icon
                className={cn('size-3', !active && 'opacity-35')}
                aria-hidden
            />
        </button>
    );
}

/** Tabel "Status P2H hari ini" (desktop) — Dashboard-Desktop.png. */
export function TodayTable({
    rows,
    showJenis = true,
    showApproval = true,
}: {
    rows: TodayRow[];
    showJenis?: boolean;
    showApproval?: boolean;
}) {
    const [sort, setSort] = useState<{
        key: SortKey | null;
        dir: 'asc' | 'desc';
    }>({ key: null, dir: 'asc' });

    const sorted = useMemo(() => {
        if (!sort.key) {
            return rows;
        }

        const key = sort.key;
        const dir = sort.dir === 'asc' ? 1 : -1;

        return [...rows].sort((a, b) => {
            const va = sortValue(a, key);
            const vb = sortValue(b, key);

            return va < vb ? -dir : va > vb ? dir : 0;
        });
    }, [rows, sort]);

    const onSort = (key: SortKey) =>
        setSort((s) => ({
            key,
            dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc',
        }));

    const ariaSort = (key: SortKey) =>
        sort.key === key
            ? sort.dir === 'asc'
                ? 'ascending'
                : 'descending'
            : undefined;

    const th = 'h-11 px-4 text-left text-xs font-semibold text-muted-foreground';

    return (
        <div className="overflow-x-auto rounded-[14px] border-(length:--bw)">
            <table
                className={cn(
                    'w-full text-sm',
                    showJenis ? 'min-w-[900px]' : 'min-w-[720px]',
                )}
            >
                <thead className="bg-muted-2">
                    <tr>
                        <th className={th} aria-sort={ariaSort('no_unit')}>
                            <SortButton label="Unit" column="no_unit" sort={sort} onSort={onSort} />
                        </th>
                        {showJenis && (
                            <th className={th} aria-sort={ariaSort('jenis_unit')}>
                                <SortButton label="Jenis" column="jenis_unit" sort={sort} onSort={onSort} />
                            </th>
                        )}
                        <th className={th} aria-sort={ariaSort('driver')}>
                            <SortButton label="Driver" column="driver" sort={sort} onSort={onSort} />
                        </th>
                        <th className={th} aria-sort={ariaSort('p2h')}>
                            <SortButton label="P2H" column="p2h" sort={sort} onSort={onSort} />
                        </th>
                        <th className={th} aria-sort={ariaSort('waktu')}>
                            <SortButton label="Waktu" column="waktu" sort={sort} onSort={onSort} />
                        </th>
                        {showApproval && (
                            <th className={th} aria-sort={ariaSort('approval')}>
                                <SortButton label="Persetujuan" column="approval" sort={sort} onSort={onSort} />
                            </th>
                        )}
                        <th className={th} aria-sort={ariaSort('unit_status')}>
                            <SortButton label="Status unit" column="unit_status" sort={sort} onSort={onSort} />
                        </th>
                        <th className={th}>
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((row) => (
                        <tr
                            key={row.unit_id}
                            className={cn(
                                'h-[52px] border-t-(length:--bw)',
                                row.p2h === 'tidak-wajib' && 'opacity-60',
                            )}
                        >
                            <td className="px-4 font-semibold whitespace-nowrap tnum">
                                {row.no_unit}
                            </td>
                            {showJenis && (
                                <td className="px-4 text-muted-foreground">
                                    {row.jenis_unit}
                                </td>
                            )}
                            <td className="px-4">
                                <DriverCell row={row} />
                            </td>
                            <td className="px-4">
                                <P2hResultPill row={row} size="sm" />
                            </td>
                            <td className="px-4 tnum">{row.waktu ?? '—'}</td>
                            {showApproval && (
                                <td className="px-4">
                                    <ApprovalText row={row} />
                                </td>
                            )}
                            <td className="px-4">
                                <UnitStatusPill status={row.unit_status} />
                            </td>
                            <td className="px-4 text-right">
                                <RowAction row={row} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DriverCell({ row }: { row: TodayRow }) {
    const name = row.driver ?? '—';

    if (row.drivers.length < 2) {
        return <span>{name}</span>;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span tabIndex={0} className="rounded">
                    {name}{' '}
                    <span className="text-muted-foreground">
                        +{row.drivers.length - 1}
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                {row.drivers
                    .map((d) => `${d.name ?? '—'} · ${d.time ?? '—'}`)
                    .join(' → ')}
            </TooltipContent>
        </Tooltip>
    );
}

/** Kartu daftar mobile untuk satu unit. */
export function TodayListCard({ row }: { row: TodayRow }) {
    const href = row.session_id
        ? `/p2h/${row.session_id}`
        : undefined;

    const body = (
        <>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold tnum">{row.no_unit}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                        {row.jenis_unit}
                    </span>
                </div>
                <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {row.driver ?? 'Belum ada driver'}
                    {row.waktu && ` · ${row.waktu}`}
                    {row.approval && row.approval.status !== 'disetujui' && (
                        <>
                            {' · '}
                            <ApprovalText row={row} />
                        </>
                    )}
                </div>
            </div>
            {canRemind(row) ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <P2hResultPill row={row} size="sm" />
                    <RemindButton row={row} />
                </div>
            ) : (
                <P2hResultPill row={row} size="sm" />
            )}
            {href && (
                <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
            )}
        </>
    );

    const cls =
        'flex min-h-[72px] items-center gap-3 rounded-[14px] border-(length:--bw) bg-card px-4 py-3';

    return href ? (
        <Link href={href} className={cn(cls, 'press')}>
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    );
}
