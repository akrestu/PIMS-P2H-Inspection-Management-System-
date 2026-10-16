import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/pims/page-header';
import { Switch } from '@/components/pims/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';

/*
 * Pengaturan aplikasi (design/screens/Pengaturan-Desktop.png): nav seksi kiri +
 * kolom 720. Hanya pengaturan yang sudah didukung backend yang ditampilkan.
 */

interface Props {
    settings: {
        shifts: string[];
        unit_analytics: boolean;
        public_report_url: string | null;
    };
}

const SECTIONS = [
    { id: 'shift', label: 'Shift kerja' },
    { id: 'rekap', label: 'Rekap publik' },
    { id: 'fitur', label: 'Fitur opsional' },
];

function Section({
    id,
    title,
    description,
    action,
    children,
}: {
    id: string;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="scroll-mt-6 rounded-[14px] border-(length:--bw) bg-card p-5"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 id={`${id}-title`} className="text-base font-semibold">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {action}
            </div>
            {children && <div className="mt-4">{children}</div>}
        </section>
    );
}

function PublicLink({ url }: { url: string | null }) {
    const run = (action: 'enable' | 'regenerate' | 'disable') => {
        if (
            action !== 'enable' &&
            !window.confirm(
                action === 'regenerate'
                    ? 'Tautan lama tidak akan bisa dibuka lagi. Lanjutkan?'
                    : 'Nonaktifkan tautan rekap publik?',
            )
        ) {
            return;
        }

        router.post('/app-settings/public-link', { action }, { preserveScroll: true });
    };

    const copy = async () => {
        if (!url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success('Tautan disalin');
        } catch {
            toast.error('Gagal menyalin, salin manual dari kolom tautan');
        }
    };

    return (
        <Section
            id="rekap"
            title="Tautan rekap publik"
            description="Siapa pun yang punya tautan bisa melihat rekap tanpa login (tanpa nama driver). Dipakai di pesan WhatsApp harian."
            action={
                <Switch
                    checked={!!url}
                    label="Tautan rekap publik aktif"
                    onCheckedChange={(on) => run(on ? 'enable' : 'disable')}
                />
            }
        >
            {url ? (
                <>
                    <div className="flex gap-2">
                        <Input
                            value={url}
                            readOnly
                            aria-label="Tautan rekap publik"
                            onFocus={(e) => e.target.select()}
                            className="h-10 bg-muted-2 font-mono text-[13px]"
                        />
                        <Button type="button" variant="outline" onClick={copy}>
                            Salin
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                Lihat
                            </a>
                        </Button>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => run('regenerate')}
                            className="text-[13px] font-semibold text-danger hover:underline"
                        >
                            Buat ulang token
                        </button>
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Tautan nonaktif. Aktifkan untuk membuat tautan baru.
                </p>
            )}
        </Section>
    );
}

export default function AppSettingsPage({ settings }: Props) {
    const initial = {
        shifts: settings.shifts ?? ['Shift I', 'Shift II'],
        unit_analytics: settings.unit_analytics ?? false,
    };
    const { data, setData, post, processing, errors, isDirty, reset, setDefaults } =
        useForm(initial);

    const save = () =>
        post('/app-settings', {
            preserveScroll: true,
            // Nilai tersimpan jadi acuan baru → bar "belum disimpan" hilang
            onSuccess: () => setDefaults(),
            onError: () => toast.error('Gagal menyimpan pengaturan'),
        });

    const updateShift = (i: number, v: string) =>
        setData('shifts', data.shifts.map((s, idx) => (idx === i ? v : s)));

    return (
        <>
            <Head title="Pengaturan aplikasi" />
            <div className="flex flex-col gap-5 px-4 pt-5 pb-24 lg:px-10 lg:pt-8">
                <PageHeader
                    title="Pengaturan aplikasi"
                    description="Berlaku untuk semua site · setiap perubahan tercatat di Audit log"
                />

                <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,720px)]">
                    <nav aria-label="Seksi pengaturan" className="hidden lg:block">
                        <ul className="sticky top-6 space-y-1">
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <a
                                        href={`#${s.id}`}
                                        className="block rounded-[8px] px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        {s.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="space-y-5">
                        <Section
                            id="shift"
                            title="Shift kerja"
                            description="Daftar shift yang bisa dipilih di Form P2H."
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                {data.shifts.map((shift, i) => (
                                    <div key={i} className="rounded-[12px] bg-muted-2 p-3 ring-1 ring-border ring-inset">
                                        <label className="text-[13px] font-semibold" htmlFor={`shift-${i}`}>
                                            Shift {i + 1}
                                        </label>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Input
                                                id={`shift-${i}`}
                                                value={shift}
                                                onChange={(e) => updateShift(i, e.target.value)}
                                                placeholder="Contoh: Shift I"
                                                className="h-10 bg-background"
                                            />
                                            <Button
                                                aria-label={`Hapus shift ${i + 1}`}
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-danger hover:text-danger"
                                                onClick={() =>
                                                    setData('shifts', data.shifts.filter((_, idx) => idx !== i))
                                                }
                                                disabled={data.shifts.length <= 1}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.shifts && (
                                <p className="mt-2 text-[13px] font-medium text-danger">{errors.shifts}</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => setData('shifts', [...data.shifts, ''])}
                            >
                                <Plus />
                                Tambah shift
                            </Button>
                        </Section>

                        <PublicLink url={settings.public_report_url} />

                        <Section
                            id="fitur"
                            title="Fitur opsional"
                            description="Fitur di luar alur utama P2H, monitoring, temuan, laporan, dan PA."
                        >
                            <div className="flex items-start justify-between gap-4 border-t-(length:--bw) pt-4">
                                <div>
                                    <p className="text-[15px] font-medium">Analitik unit</p>
                                    <p className="text-[13px] text-muted-foreground">
                                        Kerusakan per item & unit, efisiensi BBM, dan jadwal servis berkala.
                                    </p>
                                </div>
                                <Switch
                                    checked={data.unit_analytics}
                                    label="Analitik unit"
                                    onCheckedChange={(v) => setData('unit_analytics', v)}
                                />
                            </div>
                        </Section>
                    </div>
                </div>
            </div>

            {/* Bar "Perubahan belum disimpan" hanya bila ada perubahan (docs/screens/admin.md) */}
            {isDirty && (
                <div
                    role="region"
                    aria-label="Perubahan belum disimpan"
                    className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-[560px] items-center justify-between gap-3 rounded-[14px] bg-foreground px-4 py-3 text-background shadow-lg lg:bottom-6 lg:left-[calc(264px+2rem)]"
                >
                    <span className="text-sm font-medium">Perubahan belum disimpan</span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-background hover:bg-background/10 hover:text-background"
                            onClick={() => reset()}
                        >
                            Batalkan
                        </Button>
                        <Button size="sm" variant="brand" onClick={save} disabled={processing}>
                            {processing ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

AppSettingsPage.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[{ title: 'Pengaturan aplikasi', href: '/app-settings' }]}>
        {page}
    </AppLayout>
);
