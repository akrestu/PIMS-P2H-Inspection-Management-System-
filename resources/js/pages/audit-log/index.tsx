import { Head, router } from '@inertiajs/react';
import { Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageButtons } from '@/components/pagination-bar';
import { FilterChips } from '@/components/pims/filter-chips';
import { PageHeader } from '@/components/pims/page-header';
import { ResponsiveDrawer } from '@/components/pims/responsive-drawer';
import { Segmented } from '@/components/pims/segmented';
import { EmptyState } from '@/components/pims/states';
import { SortableHead } from '@/components/sortable-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClipboard } from '@/hooks/use-clipboard';
import { useInitials } from '@/hooks/use-initials';
import { formatDate, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
 * Audit log (design/screens/AuditLog-Desktop.png, docs/screens/admin.md).
 * Data dari spatie/activitylog; tag aksi diturunkan dari kata kerja deskripsi.
 */

interface LogEntry {
    id: number;
    log_name: 'user' | 'unit' | 'p2h' | string;
    description: string;
    causer_name: string;
    causer_role: string;
    properties: Record<string, unknown>;
    created_at: string;
    created_at_iso: string;
}

interface PaginatedLogs {
    data: LogEntry[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    logs: PaginatedLogs;
    filters: {
        log_name?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

type Action = 'buat' | 'ubah' | 'hapus' | 'login' | 'otomatis';

const ACTION_META: Record<Action, { label: string; className: string }> = {
    buat: { label: 'Buat', className: 'bg-success-soft text-success' },
    ubah: { label: 'Ubah', className: 'bg-info-soft text-info' },
    hapus: { label: 'Hapus', className: 'bg-danger-soft text-danger' },
    login: { label: 'Login', className: 'bg-muted text-muted-foreground' },
    otomatis: { label: 'Otomatis', className: 'bg-warning-soft text-warning' },
};

const MODULE: Record<string, string> = {
    user: 'Pengguna',
    unit: 'Master unit',
    p2h: 'P2H',
    settings: 'Pengaturan',
};

const SYSTEM = 'System';

function actionOf(log: LogEntry): Action {
    if (log.causer_name === SYSTEM) {
        return 'otomatis';
    }

    const d = log.description.toLowerCase();

    if (/^(masuk|login)/.test(d)) {
        return 'login';
    }

    if (/^(menghapus|memindahkan ke sampah|membuang)/.test(d)) {
        return 'hapus';
    }

    if (/^(menambahkan|membuat|mengimpor|mengundang|mendaftarkan)/.test(d)) {
        return 'buat';
    }

    return 'ubah';
}

/** "Hari ini · 06:21" / "Kemarin · 14:03" / "14 Okt · 17:20". */
function whenLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const day = same(d, today)
        ? 'Hari ini'
        : same(d, yesterday)
          ? 'Kemarin'
          : formatDate(d, { withYear: false });

    return `${day} · ${formatTime(d)}`;
}

/** Kelompokkan log per hari: "Hari ini · Sab, 17 Okt", "Kemarin · …", "14 Okt 2026". */
function groupByDay(logs: LogEntry[]): [string, LogEntry[]][] {
    const groups = new Map<string, LogEntry[]>();
    const today = new Date().toDateString();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toDateString();

    for (const log of logs) {
        const d = new Date(log.created_at_iso);
        const key = d.toDateString();
        const label =
            key === today
                ? `Hari ini · ${formatDate(d, { withDay: true, withYear: false })}`
                : key === yesterday
                  ? `Kemarin · ${formatDate(d, { withDay: true, withYear: false })}`
                  : formatDate(d);
        groups.set(label, [...(groups.get(label) ?? []), log]);
    }

    return [...groups.entries()];
}

const isoDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);

    return d.toLocaleDateString('en-CA');
};

/** Kalimat deskripsi dengan objek (kode unit / nama setelah ":") ditebalkan. */
function Sentence({ text }: { text: string }) {
    const [verb, ...rest] = text.split(': ');

    if (rest.length > 0) {
        return (
            <>
                {verb}: <b className="font-semibold">{rest.join(': ')}</b>
            </>
        );
    }

    const m = text.match(/^(.*?)([A-Z]{2,4}-[\w-]+.*)$/);

    return m ? (
        <>
            {m[1]}
            <b className="font-semibold">{m[2]}</b>
        </>
    ) : (
        <>{text}</>
    );
}

function Changes({ properties }: { properties: Record<string, unknown> }) {
    const after = (properties.attributes ?? null) as Record<
        string,
        unknown
    > | null;
    const before = (properties.old ?? null) as Record<string, unknown> | null;
    const show = (v: unknown) =>
        v === null || v === undefined || v === ''
            ? '—'
            : typeof v === 'object'
              ? JSON.stringify(v)
              : String(v);

    if (after) {
        const fields = Object.keys(after);

        return (
            <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                        <th className="pb-2 font-semibold">Field</th>
                        <th className="pb-2 font-semibold">Sebelum</th>
                        <th className="pb-2 font-semibold">Sesudah</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((f) => (
                        <tr key={f} className="border-t-(length:--bw)">
                            <td className="py-2 pr-3 font-mono text-xs">{f}</td>
                            <td className="py-2 pr-3 text-danger line-through">
                                {show(before?.[f])}
                            </td>
                            <td className="py-2 text-success">
                                {show(after[f])}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    const entries = Object.entries(properties);

    if (entries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Tidak ada data tambahan.
            </p>
        );
    }

    return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {entries.map(([k, v]) => (
                <div key={k} className="contents">
                    <dt className="font-mono text-xs text-muted-foreground">
                        {k}
                    </dt>
                    <dd className="break-words">{show(v)}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function AuditLogIndex({ logs, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [detail, setDetail] = useState<LogEntry | null>(null);
    const getInitials = useInitials();
    const [, copy] = useClipboard();

    const apply = (next: Partial<Props['filters']> & { page?: number }) =>
        router.get(
            '/audit-log',
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const range =
        !filters.date_from && !filters.date_to
            ? 'semua'
            : filters.date_to
              ? 'custom'
              : filters.date_from === isoDaysAgo(0)
                ? '1'
                : filters.date_from === isoDaysAgo(6)
                  ? '7'
                  : filters.date_from === isoDaysAgo(29)
                    ? '30'
                    : 'custom';

    const setRange = (v: string) =>
        apply({
            date_from: v === 'semua' ? undefined : isoDaysAgo(Number(v) - 1),
            date_to: undefined,
            page: 1,
        });

    return (
        <>
            <Head title="Audit log" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Audit log"
                    description="Semua perubahan data tercatat dan tidak bisa diedit"
                    actions={
                        <Segmented
                            label="Rentang"
                            value={range}
                            onChange={setRange}
                            options={[
                                { value: '1', label: 'Hari ini' },
                                { value: '7', label: '7 hari' },
                                { value: '30', label: '30 hari' },
                                { value: 'semua', label: 'Semua' },
                            ]}
                        />
                    }
                />

                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <form
                        className="relative w-full lg:w-80"
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({ search: search || undefined, page: 1 });
                        }}
                    >
                        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari deskripsi atau objek"
                            aria-label="Cari log"
                            className="h-12 pl-10 lg:h-10"
                        />
                    </form>
                    <FilterChips
                        label="Modul"
                        className="-mx-4 px-4 lg:mx-0 lg:px-0"
                        value={filters.log_name ?? 'semua'}
                        onChange={(v) =>
                            apply({
                                log_name: v === 'semua' ? undefined : v,
                                page: 1,
                            })
                        }
                        options={[
                            { value: 'semua', label: 'Semua modul' },
                            { value: 'p2h', label: 'P2H' },
                            { value: 'unit', label: 'Master unit' },
                            { value: 'user', label: 'Pengguna' },
                        ]}
                    />
                </div>

                {logs.data.length === 0 ? (
                    <EmptyState
                        title="Tidak ada log"
                        description="Tidak ada log yang cocok dengan filter."
                    />
                ) : (
                    <>
                        {/* Mobile: daftar per tanggal (AuditLog.png) */}
                        <div className="-mx-4 lg:hidden">
                            {groupByDay(logs.data).map(([day, items]) => (
                                <section key={day}>
                                    <h2 className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground">
                                        {day}
                                    </h2>
                                    <ul>
                                        {items.map((log) => {
                                            const action =
                                                ACTION_META[actionOf(log)];
                                            const system =
                                                log.causer_name === SYSTEM;

                                            return (
                                                <li key={log.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDetail(log)
                                                        }
                                                        className="flex min-h-12 w-full press items-start gap-3 px-4 py-3 text-left hover:bg-muted-2"
                                                    >
                                                        <span
                                                            className={cn(
                                                                'grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                                                                system
                                                                    ? 'bg-foreground text-background'
                                                                    : 'bg-muted',
                                                            )}
                                                        >
                                                            {system
                                                                ? 'SY'
                                                                : getInitials(
                                                                      log.causer_name,
                                                                  )}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-[15px] leading-snug">
                                                                <b className="font-semibold">
                                                                    {system
                                                                        ? 'Sistem'
                                                                        : log.causer_name}
                                                                </b>{' '}
                                                                <span className="text-muted-foreground">
                                                                    <Sentence
                                                                        text={
                                                                            log.description
                                                                        }
                                                                    />
                                                                </span>
                                                            </span>
                                                            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground tnum">
                                                                <span
                                                                    className={cn(
                                                                        'inline-flex h-5 items-center rounded-md px-1.5 text-xs font-semibold',
                                                                        action.className,
                                                                    )}
                                                                >
                                                                    {
                                                                        action.label
                                                                    }
                                                                </span>
                                                                {formatTime(
                                                                    new Date(
                                                                        log.created_at_iso,
                                                                    ),
                                                                )}
                                                                <span>
                                                                    ·{' '}
                                                                    {MODULE[
                                                                        log
                                                                            .log_name
                                                                    ] ??
                                                                        log.log_name}
                                                                </span>
                                                            </span>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto rounded-[14px] border-(length:--bw) lg:block">
                            <table className="w-full min-w-[920px] text-sm">
                                <thead className="bg-muted-2 text-left text-xs text-muted-foreground">
                                    <tr className="h-11">
                                        <SortableHead
                                            column="created_at"
                                            plain
                                            descFirst
                                            className="px-4"
                                        >
                                            Waktu
                                        </SortableHead>
                                        <SortableHead
                                            column="causer"
                                            plain
                                            className="px-4"
                                        >
                                            Pengguna
                                        </SortableHead>
                                        <th className="px-4 font-semibold">
                                            Aksi
                                        </th>
                                        <SortableHead
                                            column="description"
                                            plain
                                            className="px-4"
                                        >
                                            Deskripsi
                                        </SortableHead>
                                        <SortableHead
                                            column="log_name"
                                            plain
                                            className="px-4"
                                        >
                                            Modul
                                        </SortableHead>
                                        <th className="px-4">
                                            <span className="sr-only">
                                                Detail
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.data.map((log) => {
                                        const action =
                                            ACTION_META[actionOf(log)];
                                        const system =
                                            log.causer_name === SYSTEM;

                                        return (
                                            <tr
                                                key={log.id}
                                                className="h-[52px] border-t-(length:--bw)"
                                            >
                                                <td className="px-4 whitespace-nowrap tnum">
                                                    {whenLabel(
                                                        log.created_at_iso,
                                                    )}
                                                </td>
                                                <td className="px-4">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span
                                                                tabIndex={0}
                                                                className="inline-flex items-center gap-2 whitespace-nowrap"
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        'grid size-7 place-items-center rounded-full text-[10px] font-bold',
                                                                        system
                                                                            ? 'bg-foreground text-background'
                                                                            : 'bg-muted',
                                                                    )}
                                                                >
                                                                    {system
                                                                        ? 'SY'
                                                                        : getInitials(
                                                                              log.causer_name,
                                                                          )}
                                                                </span>
                                                                {system
                                                                    ? 'Sistem'
                                                                    : log.causer_name}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {system
                                                                ? 'Dijalankan otomatis oleh sistem'
                                                                : `${log.causer_name} · ${log.causer_role}`}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-4">
                                                    <span
                                                        className={cn(
                                                            'inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold',
                                                            action.className,
                                                        )}
                                                    >
                                                        {action.label}
                                                    </span>
                                                </td>
                                                <td className="max-w-[420px] truncate px-4">
                                                    <Sentence
                                                        text={log.description}
                                                    />
                                                </td>
                                                <td className="px-4 whitespace-nowrap text-muted-foreground">
                                                    {MODULE[log.log_name] ??
                                                        log.log_name}
                                                </td>
                                                <td className="px-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setDetail(log)
                                                        }
                                                    >
                                                        Detail
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground sm:flex-row sm:justify-between">
                    <span>
                        {logs.total} entri · urut terbaru dulu · log tidak dapat
                        diubah atau dihapus, termasuk oleh Admin.
                    </span>
                    {logs.last_page > 1 && (
                        <PageButtons
                            currentPage={logs.current_page}
                            lastPage={logs.last_page}
                            onPageChange={(page) => apply({ page })}
                        />
                    )}
                </div>
            </div>

            <ResponsiveDrawer
                open={detail !== null}
                onOpenChange={(o) => !o && setDetail(null)}
                title={
                    detail ? (
                        <Sentence
                            text={`${detail.causer_name === SYSTEM ? 'Sistem' : detail.causer_name} — ${detail.description}`}
                        />
                    ) : (
                        ''
                    )
                }
                description={
                    detail
                        ? `${detail.created_at} WIB · ${MODULE[detail.log_name] ?? detail.log_name} · AL-${detail.id}`
                        : undefined
                }
                footer={
                    detail && (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                if (await copy(`AL-${detail.id}`)) {
                                    toast.success('ID log disalin');
                                }
                            }}
                        >
                            <Copy />
                            Salin ID log
                        </Button>
                    )
                }
            >
                {detail && (
                    <div className="space-y-5">
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">
                                Perubahan
                            </h3>
                            <Changes properties={detail.properties ?? {}} />
                        </section>
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">
                                Konteks
                            </h3>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">
                                    Pelaku
                                </dt>
                                <dd>
                                    {detail.causer_name === SYSTEM
                                        ? 'Sistem (otomatis)'
                                        : `${detail.causer_name} · ${detail.causer_role}`}
                                </dd>
                                <dt className="text-muted-foreground">Modul</dt>
                                <dd>
                                    {MODULE[detail.log_name] ?? detail.log_name}
                                </dd>
                                <dt className="text-muted-foreground">
                                    ID log
                                </dt>
                                <dd className="font-mono">AL-{detail.id}</dd>
                            </dl>
                        </section>
                    </div>
                )}
            </ResponsiveDrawer>
        </>
    );
}

AuditLogIndex.layout = {
    breadcrumbs: [{ title: 'Audit log', href: '/audit-log' }],
};
