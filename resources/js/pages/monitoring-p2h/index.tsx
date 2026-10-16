import { Head, router } from '@inertiajs/react';
import { Bell, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    TodayListCard,
    TodayTable,
    canRemind,
    filterRows,
    sendReminder,
} from '@/components/dashboard/today-status';
import type {
    TodayFilter,
    TodayFleet,
    TodayRow,
    TodaySummary,
} from '@/components/dashboard/today-status';
import { PageButtons } from '@/components/pagination-bar';
import { FilterChips } from '@/components/pims/filter-chips';
import { KpiCard, KpiStrip } from '@/components/pims/kpi';
import { PageHeader } from '@/components/pims/page-header';
import { EmptyState } from '@/components/pims/states';
import { Button } from '@/components/ui/button';
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

type FeedItem = {
    type: 'masuk' | 'rusak' | 'bd' | 'disetujui' | 'ditolak';
    no_unit: string;
    text: string;
    at: string;
    /** Jam lokal server (H:i), sama dengan kolom Waktu di tabel. */
    time: string;
};

interface Props {
    today: { rows: TodayRow[]; summary: TodaySummary; fleet: TodayFleet };
    feed: FeedItem[];
    updatedAt: string;
}

const PER_PAGE = 12;
const POLL_MS = 30_000;

const FEED_DOT: Record<FeedItem['type'], string> = {
    masuk: 'bg-muted-foreground',
    rusak: 'bg-warning',
    bd: 'bg-danger',
    disetujui: 'bg-success',
    ditolak: 'bg-danger',
};

const FILTER_LABEL: Record<TodayFilter, string> = {
    semua: 'Semua',
    belum: 'Belum P2H',
    'tidak-layak': 'Tidak layak',
    menunggu: 'Menunggu persetujuan',
};

/** "Diperbarui 12 dtk lalu" — berdetak tiap 5 detik. */
function useAgo(iso: string) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 5_000);

        return () => window.clearInterval(t);
    }, []);

    const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));

    return sec < 60 ? `${sec} dtk lalu` : `${Math.round(sec / 60)} mnt lalu`;
}

export default function MonitoringP2h({ today, feed, updatedAt }: Props) {
    const { rows, summary } = today;
    const [filter, setFilter] = useState<TodayFilter>('semua');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [reminding, setReminding] = useState(false);
    const ago = useAgo(updatedAt);

    const refresh = () =>
        router.reload({
            only: ['today', 'feed', 'updatedAt'],
            onStart: () => setRefreshing(true),
            onFinish: () => setRefreshing(false),
        });

    // Polling 30 detik selama tab terlihat (docs/screens/manager-ops.md)
    useEffect(() => {
        const t = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['today', 'feed', 'updatedAt'] });
            }
        }, POLL_MS);

        return () => window.clearInterval(t);
    }, []);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return filterRows(rows, filter).filter(
            (r) =>
                !q ||
                r.no_unit.toLowerCase().includes(q) ||
                (r.driver ?? '').toLowerCase().includes(q),
        );
    }, [rows, filter, query]);

    const lastPage = Math.max(1, Math.ceil(visible.length / PER_PAGE));
    const current = Math.min(page, lastPage);
    const pageRows = visible.slice((current - 1) * PER_PAGE, current * PER_PAGE);
    const pct =
        summary.required > 0 ? (summary.submitted / summary.required) * 100 : 0;
    // Unit belum P2H yang punya driver ditugaskan → target "Ingatkan semua"
    const remindable = rows.filter(canRemind);
    const remindAll = () => {
        setReminding(true);
        sendReminder(
            remindable.map((r) => r.unit_id),
            () => setReminding(false),
        );
    };
    const pickFilter = (f: TodayFilter) => {
        setFilter((cur) => (cur === f ? 'semua' : f));
        setPage(1);
    };

    return (
        <>
            <Head title="Monitoring P2H" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Monitoring P2H"
                    description={`${formatDate(new Date(), { withDay: true })} · hari berjalan`}
                    actions={
                        <button
                            type="button"
                            onClick={refresh}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] border-(length:--bw) px-3.5 text-[13px] font-medium hover:bg-muted"
                            aria-label={`Diperbarui ${ago}. Muat ulang`}
                        >
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-2 rounded-full bg-success" />
                            </span>
                            Diperbarui {ago}
                            <RefreshCw
                                className={cn(
                                    'size-3.5 text-muted-foreground',
                                    refreshing && 'animate-spin',
                                )}
                                aria-hidden
                            />
                        </button>
                    }
                />

                {/* KPI = filter (aria-pressed) */}
                <KpiStrip cols={4}>
                    <KpiCard
                        label="P2H masuk"
                        value={summary.submitted}
                        unit={`/ ${summary.required}`}
                        progress={pct}
                        sub={`${formatPercent(pct)} unit wajib`}
                        onClick={() => pickFilter('semua')}
                        active={filter === 'semua'}
                    />
                    <KpiCard
                        label="Belum P2H"
                        value={summary.belum}
                        tone={summary.belum > 0 ? 'warning' : 'default'}
                        sub="unit Ready belum diperiksa"
                        onClick={() => pickFilter('belum')}
                        active={filter === 'belum'}
                    />
                    <KpiCard
                        label="Tidak layak"
                        value={summary.tidak_layak.length}
                        tone={summary.tidak_layak.length > 0 ? 'danger' : 'default'}
                        sub="otomatis BD sampai diperbaiki"
                        onClick={() => pickFilter('tidak-layak')}
                        active={filter === 'tidak-layak'}
                    />
                    <KpiCard
                        label="Menunggu persetujuan"
                        value={summary.waiting}
                        sub={
                            summary.escalated > 0
                                ? `${summary.escalated} eskalasi`
                                : 'tidak ada eskalasi'
                        }
                        onClick={() => pickFilter('menunggu')}
                        active={filter === 'menunggu'}
                    />
                </KpiStrip>

                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            <label className="field flex h-12 items-center gap-3 rounded-[12px] border-(length:--bw) border-input bg-background px-3.5 lg:h-10 lg:w-72 lg:rounded-[10px]">
                                <Search className="size-4 text-muted-foreground" aria-hidden />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Cari unit atau driver"
                                    aria-label="Cari unit atau driver"
                                    className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground lg:text-sm"
                                />
                            </label>
                            {filter !== 'semua' && (
                                <button
                                    type="button"
                                    onClick={() => setFilter('semua')}
                                    className="inline-flex h-[34px] items-center gap-1.5 self-start rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground lg:self-auto"
                                >
                                    {FILTER_LABEL[filter]}
                                    <X className="size-3.5" aria-label="Hapus filter" />
                                </button>
                            )}
                            {remindable.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="self-start lg:ml-auto lg:self-auto"
                                    disabled={reminding}
                                    onClick={remindAll}
                                >
                                    <Bell />
                                    Ingatkan {remindable.length} unit belum P2H
                                </Button>
                            )}
                            <FilterChips
                                label="Filter status"
                                className="-mx-4 px-4 lg:hidden"
                                value={filter}
                                onChange={pickFilter}
                                options={(
                                    ['semua', 'belum', 'tidak-layak', 'menunggu'] as const
                                ).map((v) => ({ value: v, label: FILTER_LABEL[v] }))}
                            />
                        </div>

                        {visible.length === 0 ? (
                            <EmptyState
                                title="Tidak ada unit"
                                description="Tidak ada unit dengan filter ini."
                            />
                        ) : (
                            <>
                                <div className="hidden lg:block">
                                    <TodayTable rows={pageRows} showJenis={false} />
                                </div>
                                <ul className="flex flex-col gap-2 lg:hidden">
                                    {pageRows.map((row) => (
                                        <li key={row.unit_id}>
                                            <TodayListCard row={row} />
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                                    <span className="tnum">
                                        {(current - 1) * PER_PAGE + 1}–
                                        {Math.min(current * PER_PAGE, visible.length)} dari{' '}
                                        {visible.length} unit
                                    </span>
                                    {lastPage > 1 && (
                                        <PageButtons
                                            currentPage={current}
                                            lastPage={lastPage}
                                            onPageChange={setPage}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <aside
                        aria-labelledby="feed-title"
                        className="h-fit rounded-[14px] border-(length:--bw) bg-card p-4"
                    >
                        <h2 id="feed-title" className="text-[15px] font-semibold">
                            Aktivitas terbaru
                        </h2>
                        {feed.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                                Belum ada aktivitas P2H hari ini.
                            </p>
                        ) : (
                            <ol className="mt-3 space-y-3.5" aria-live="polite">
                                {feed.map((f, i) => (
                                    <li key={`${f.at}-${i}`} className="flex gap-3">
                                        <span
                                            className={cn(
                                                'mt-1.5 size-2 shrink-0 rounded-full',
                                                FEED_DOT[f.type],
                                            )}
                                            aria-hidden
                                        />
                                        <span className="min-w-0 text-sm">
                                            <b className="font-semibold tnum">
                                                {f.no_unit}
                                            </b>{' '}
                                            {f.text}
                                            <span className="block text-xs text-muted-foreground tnum">
                                                {f.time}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

MonitoringP2h.layout = {
    breadcrumbs: [{ title: 'Monitoring P2H', href: '/monitoring-p2h' }],
};
