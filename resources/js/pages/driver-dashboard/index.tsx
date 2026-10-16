import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Wrench,
} from 'lucide-react';
import { KpiCard } from '@/components/pims/kpi';
import { ListCard } from '@/components/pims/list-card';
import { SectionHeader } from '@/components/pims/page-header';
import { EmptyState } from '@/components/pims/states';
import type { StatusKey } from '@/components/pims/status-pill';
import { KritisTag, StatusPill } from '@/components/pims/status-pill';
import { ACCOUNT_HREF } from '@/components/shell/navigation';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { formatDate, formatHM } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/driver';

interface HistoryItem {
    id: number;
    session_id: number;
    no_unit: string;
    jenis_unit: string;
    tanggal: string;
    shift: string;
    km_awal: number | null;
    kondisi_akhir: string | null;
    total_items: number;
    layak_count: number;
    tl_count: number;
    score: number;
    submitted_at: string | null;
}

interface TodayUnit {
    id: number;
    no_unit: string;
    jenis_unit: string;
    site: string | null;
    assigned: boolean;
    status: string;
    hm_terakhir: number | string | null;
}

interface CurrentEntry {
    session_id: number;
    no_unit: string | null;
    submitted_at: string | null;
    kondisi_akhir: string | null;
    approval_status: 'pending' | 'approved' | 'rejected' | null;
    approver_name: string | null;
}

interface UnitFindings {
    count: number;
    overdue: number;
    items: {
        id: number;
        item_nama: string;
        kritis: boolean;
        status: 'open' | 'progress' | 'closed';
        target_selesai: string | null;
        overdue: boolean;
    }[];
}

/**
 * Penugasan unit (opsional & fleksibel, sama dengan aturan Form P2H):
 * semua (admin/manager) · unit (ditugaskan langsung) · kategori (jenis unit / site) · none.
 */
interface Assignment {
    mode: 'semua' | 'unit' | 'kategori' | 'none';
    units: { id: number; no_unit: string; jenis_unit: string }[];
    jenis_unit: string | null;
    site: string | null;
}

interface Props {
    assignment: Assignment;
    shiftAktif: 'Shift I' | 'Shift II';
    sudahP2hShiftIni: boolean;
    stats: {
        total_p2h: number;
        total_p2h_bulan: number;
        total_tidak_layak: number;
        week: { date: string; status: 'layak' | 'bd' | 'none' }[];
    };
    history: HistoryItem[];
    todayUnit: TodayUnit | null;
    currentEntry: CurrentEntry | null;
    unitFindings: UnitFindings;
}

const FORM_HREF = '/p2h/form';

const SHIFT_HOURS: Record<Props['shiftAktif'], string> = {
    'Shift I': '06:00–18:00',
    'Shift II': '18:00–06:00',
};

/** Status operasional unit (UnitStatus) → StatusPill. */
const UNIT_STATUS: Record<string, StatusKey> = {
    Ready: 'ready',
    BD: 'bd',
    PM: 'pm',
    'Servis Berkala': 'servis',
};

/** Label shift baku (docs/10): "Shift 1" / "Shift 2". */
const shiftLabel = (shift: string) =>
    shift.replace('Shift II', 'Shift 2').replace('Shift I', 'Shift 1');

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** "dd/mm/yyyy" dari controller → Date. */
const parseDmy = (value: string): Date | null => {
    const [d, m, y] = value.split('/').map(Number);

    return d && m && y ? new Date(y, m - 1, d) : null;
};

/** Teks cakupan kategori, mis. "Light Vehicle · PT. WBK Site BAU". */
const scopeText = (a: Assignment) =>
    [a.jenis_unit ?? 'Semua jenis unit', a.site].filter(Boolean).join(' · ');

/** Kartu saat belum ada unit yang bisa ditonjolkan — isi mengikuti mode penugasan. */
function NoUnitCard({
    assignment,
    shift,
    entry,
}: {
    assignment: Assignment;
    shift: Props['shiftAktif'];
    entry: CurrentEntry | null;
}) {
    const canFill = assignment.mode !== 'none';
    const copy =
        assignment.mode === 'none'
            ? {
                  title: 'Belum ada unit untuk akun Anda',
                  body: 'Akun Anda belum ditugaskan ke unit maupun kategori unit. Hubungi admin site untuk penugasan.',
              }
            : assignment.mode === 'kategori'
              ? {
                    title: 'Pilih unit saat mengisi P2H',
                    body: `Anda ditugaskan per kategori: ${scopeText(assignment)}. Semua unit dalam kategori ini bisa dipilih untuk ${shiftLabel(shift)}.`,
                }
              : {
                    title: 'Pilih unit saat mengisi P2H',
                    body: `Semua unit aktif bisa dipilih untuk ${shiftLabel(shift)}.`,
                };

    return (
        <section className="rounded-[20px] border-(length:--bw) bg-card p-5 shadow-md">
            <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                Unit hari ini
            </p>
            <h2 className="mt-3 text-xl font-semibold">{copy.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.body}</p>
            {entry ? (
                <div className="mt-5 border-t pt-4">
                    <EntryStatus entry={entry} />
                </div>
            ) : (
                canFill && (
                    <Button
                        asChild
                        variant="brand"
                        size="xl"
                        className="mt-5 w-full"
                    >
                        <Link href={FORM_HREF}>
                            <ClipboardCheck /> Isi P2H &amp; pilih unit
                        </Link>
                    </Button>
                )
            )}
        </section>
    );
}

function UnitCard({
    unit,
    assignment,
    shift,
    entry,
}: {
    unit: TodayUnit | null;
    assignment: Assignment;
    shift: Props['shiftAktif'];
    entry: CurrentEntry | null;
}) {
    if (!unit) {
        return (
            <NoUnitCard assignment={assignment} shift={shift} entry={entry} />
        );
    }

    const otherUnits = assignment.units.filter((u) => u.id !== unit.id);
    const context =
        assignment.mode === 'unit'
            ? 'Ditugaskan'
            : assignment.mode === 'kategori'
              ? 'Terakhir diperiksa'
              : assignment.mode === 'semua'
                ? 'Terakhir diperiksa'
                : null;

    return (
        <section
            className="rounded-[20px] border-(length:--bw) bg-card p-5 shadow-md"
            aria-labelledby="unit-hari-ini"
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    Unit hari ini
                    {context && (
                        <span className="ml-2 tracking-normal normal-case">
                            · {context}
                        </span>
                    )}
                </p>
                <StatusPill
                    status={UNIT_STATUS[unit.status] ?? 'ready'}
                    label={unit.status}
                />
            </div>
            <h2
                id="unit-hari-ini"
                className="mt-3 text-[40px] leading-none font-semibold tracking-[-0.03em]"
            >
                {unit.no_unit}
            </h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
                {[unit.jenis_unit, unit.site].filter(Boolean).join(' · ')}
            </p>
            {assignment.mode === 'kategori' && (
                <p className="mt-2 text-[13px] text-muted-foreground">
                    Kategori Anda: {scopeText(assignment)} — unit lain dalam
                    kategori ini juga bisa dipilih.
                </p>
            )}
            {otherUnits.length > 0 && (
                <p className="mt-2 text-[13px] text-muted-foreground">
                    Unit Anda lainnya:{' '}
                    <span className="font-medium text-foreground">
                        {otherUnits.map((u) => u.no_unit).join(', ')}
                    </span>
                </p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-4">
                <div>
                    <dt className="text-[13px] text-muted-foreground">
                        HM terakhir
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold">
                        {formatHM(unit.hm_terakhir)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[13px] text-muted-foreground">
                        {shiftLabel(shift)}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold">
                        {SHIFT_HOURS[shift]}
                    </dd>
                </div>
            </dl>

            <div className="mt-5 border-t pt-4">
                {entry ? (
                    <EntryStatus entry={entry} />
                ) : (
                    <PendingStatus shift={shift} />
                )}
            </div>
        </section>
    );
}

function PendingStatus({ shift }: { shift: Props['shiftAktif'] }) {
    return (
        <>
            <p className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-warning" aria-hidden />
                <span className="font-semibold">Belum P2H</span>
                <span className="text-muted-foreground">
                    · {shiftLabel(shift)}
                </span>
            </p>
            <Button asChild variant="brand" size="xl" className="mt-4 w-full">
                <Link href={FORM_HREF}>
                    <ClipboardCheck /> Isi P2H sekarang
                </Link>
            </Button>
        </>
    );
}

function EntryStatus({ entry }: { entry: CurrentEntry }) {
    const layak = entry.kondisi_akhir !== 'BD';
    const approval =
        entry.approval_status === 'pending'
            ? `Menunggu persetujuan${entry.approver_name ? ' · ' + entry.approver_name : ''}`
            : entry.approval_status === 'approved'
              ? 'Disetujui'
              : entry.approval_status === 'rejected'
                ? 'Ditolak — isi ulang P2H'
                : null;

    return (
        <Link
            href={`/p2h/${entry.session_id}`}
            className="-m-2 flex press items-start gap-3 rounded-[12px] p-2 hover:bg-muted"
        >
            <CheckCircle2
                className={cn(
                    'mt-0.5 size-6 shrink-0',
                    layak ? 'text-success' : 'text-danger',
                )}
                aria-hidden
            />
            <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                    P2H terkirim · {layak ? 'Layak Pakai' : 'Tidak Layak'}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                    {[entry.no_unit, entry.submitted_at]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
                {approval && (
                    <span
                        className={cn(
                            'mt-1 block text-[13px] font-medium',
                            entry.approval_status === 'pending' &&
                                'text-warning',
                            entry.approval_status === 'rejected' &&
                                'text-danger',
                            entry.approval_status === 'approved' &&
                                'text-success',
                        )}
                    >
                        {approval}
                    </span>
                )}
            </span>
            <ChevronRight
                className="mt-1 size-4 text-muted-foreground"
                aria-hidden
            />
        </Link>
    );
}

function FindingRow({ finding }: { finding: UnitFindings['items'][number] }) {
    return (
        <li>
            <Link
                href="/p2h/findings"
                className="flex press items-center gap-3 rounded-xl border-(length:--bw) bg-card p-3.5 shadow-sm hover:bg-muted"
            >
                <span
                    className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-[12px]',
                        finding.kritis
                            ? 'bg-danger-soft text-danger'
                            : 'bg-warning-soft text-warning',
                    )}
                    aria-hidden
                >
                    <AlertTriangle className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                        {finding.item_nama}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {finding.overdue ? (
                            <StatusPill status="lewat-tenggat" size="sm" />
                        ) : (
                            <StatusPill
                                status="open"
                                size="sm"
                                label={
                                    finding.status === 'progress'
                                        ? 'Progress'
                                        : 'Open'
                                }
                            />
                        )}
                        {finding.target_selesai && (
                            <span className="text-xs text-muted-foreground">
                                Tenggat{' '}
                                {formatDate(finding.target_selesai, {
                                    withYear: false,
                                })}
                            </span>
                        )}
                        {finding.kritis && <KritisTag />}
                    </span>
                </span>
                <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
            </Link>
        </li>
    );
}

/** Strip 7 hari terakhir: kuning = P2H masuk, merah = Tidak Layak, abu = tidak ada. */
function WeekStrip({ week }: { week: Props['stats']['week'] }) {
    const done = week.filter((d) => d.status !== 'none').length;

    return (
        <div className="mt-2.5">
            <div
                className="flex gap-1"
                role="img"
                aria-label={`${done} dari 7 hari terakhir ada P2H`}
            >
                {week.map((d) => (
                    <span
                        key={d.date}
                        title={formatDate(d.date, { withDay: true, withYear: false })}
                        className={cn(
                            'h-1.5 flex-1 rounded-full',
                            d.status === 'layak' && 'bg-chart-1',
                            d.status === 'bd' && 'bg-danger',
                            d.status === 'none' && 'bg-muted',
                        )}
                    />
                ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
                {done} dari 7 hari terakhir
            </p>
        </div>
    );
}

export default function DriverDashboardIndex({
    assignment,
    shiftAktif,
    stats,
    history,
    todayUnit,
    currentEntry,
    unitFindings,
}: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;
    const getInitials = useInitials();
    const now = new Date();
    const today = `${new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)}, ${formatDate(now, { withYear: false })}`;

    return (
        <>
            <Head title="Beranda" />
            <div className="mx-auto w-full max-w-[640px] space-y-8 px-4 pt-5 pb-8 lg:pt-8">
                <header className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[13px] text-muted-foreground">
                            {today} · {shiftLabel(shiftAktif)}
                        </p>
                        <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.02em]">
                            Halo, {firstName(auth.user.name)}
                        </h1>
                    </div>
                    <Link
                        href={ACCOUNT_HREF}
                        aria-label="Akun saya"
                        className="grid size-12 shrink-0 press place-items-center rounded-full bg-muted text-sm font-semibold lg:hidden"
                    >
                        {getInitials(auth.user.name)}
                    </Link>
                </header>

                <UnitCard
                    unit={todayUnit}
                    assignment={assignment}
                    shift={shiftAktif}
                    entry={currentEntry}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex min-w-0 flex-col">
                        <KpiCard
                            variant="plain"
                            label="P2H bulan ini"
                            value={stats.total_p2h_bulan}
                        />
                        <WeekStrip week={stats.week} />
                    </div>
                    <KpiCard
                        variant="plain"
                        label="Temuan aktif"
                        value={unitFindings.count}
                        tone={unitFindings.overdue > 0 ? 'danger' : 'default'}
                        sub={
                            unitFindings.overdue > 0
                                ? `${unitFindings.overdue} lewat tenggat`
                                : 'Tidak ada yang lewat tenggat'
                        }
                        subTone={
                            unitFindings.overdue > 0 ? 'danger' : 'default'
                        }
                    />
                </div>

                {todayUnit && (
                    <section className="space-y-3">
                        <SectionHeader
                            title={`Temuan ${todayUnit.no_unit}`}
                            action={
                                unitFindings.count > 0 && (
                                    <Link
                                        href="/p2h/findings"
                                        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                                    >
                                        Lihat semua
                                    </Link>
                                )
                            }
                        />
                        {unitFindings.items.length > 0 ? (
                            <ul className="space-y-2">
                                {unitFindings.items.map((f) => (
                                    <FindingRow key={f.id} finding={f} />
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<Wrench className="size-6" />}
                                title="Tidak ada temuan terbuka"
                                description={`Semua temuan ${todayUnit.no_unit} sudah ditutup.`}
                                className="py-8"
                            />
                        )}
                    </section>
                )}

                <section className="space-y-3">
                    <SectionHeader
                        title="Riwayat P2H"
                        action={
                            history.length > 0 && (
                                <Link
                                    href="/p2h"
                                    className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    Semua
                                </Link>
                            )
                        }
                    />
                    {history.length > 0 ? (
                        <div className="space-y-2">
                            {history.slice(0, 5).map((item) => {
                                const date = parseDmy(item.tanggal);
                                const time = item.submitted_at?.split(' ')[1];

                                return (
                                    <ListCard
                                        key={item.id}
                                        title={item.no_unit}
                                        meta={[
                                            date
                                                ? formatDate(date, {
                                                      withYear: false,
                                                  })
                                                : item.tanggal,
                                            shiftLabel(item.shift),
                                            time,
                                            item.tl_count > 0
                                                ? `${item.tl_count} item rusak`
                                                : `${item.total_items} item baik`,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                        trailing={
                                            <StatusPill
                                                size="sm"
                                                status={
                                                    item.kondisi_akhir === 'BD'
                                                        ? 'tidak-layak'
                                                        : 'layak'
                                                }
                                                label={
                                                    item.kondisi_akhir === 'BD'
                                                        ? 'Tidak Layak'
                                                        : 'Layak'
                                                }
                                            />
                                        }
                                        onOpen={() =>
                                            router.visit(
                                                `/p2h/${item.session_id}`,
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            title="Belum ada riwayat P2H"
                            description="P2H yang Anda kirim akan muncul di sini."
                            action={
                                <Button asChild variant="outline">
                                    <Link href={FORM_HREF}>
                                        Isi P2H pertama
                                    </Link>
                                </Button>
                            }
                        />
                    )}
                </section>
            </div>
        </>
    );
}

DriverDashboardIndex.layout = {
    breadcrumbs: [{ title: 'Beranda', href: dashboard() }],
};
