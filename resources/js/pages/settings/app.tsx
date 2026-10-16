import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';

interface Props {
    settings: {
        shifts: string[];
        unit_analytics: boolean;
        public_report_url: string | null;
    };
}

function PublicLinkCard({ url }: { url: string | null }) {
    const run = (action: 'enable' | 'regenerate' | 'disable') => {
        if (
            action !== 'enable' &&
            !window.confirm(
                action === 'regenerate'
                    ? 'Link lama tidak akan bisa dibuka lagi. Lanjutkan?'
                    : 'Nonaktifkan link rekap publik?',
            )
        ) {
            return;
        }

        router.post(
            '/app-settings/public-link',
            { action },
            { preserveScroll: true },
        );
    };

    const copy = async () => {
        if (!url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link disalin');
        } catch {
            toast.error('Gagal menyalin, salin manual dari kolom link');
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    Link Rekap P2H Publik
                </CardTitle>
                <CardDescription>
                    Kalender P2H bulanan yang bisa dibuka tanpa login (tanpa
                    nama driver). Link ikut tercantum di Daily Report WhatsApp.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {url ? (
                    <>
                        <div className="flex gap-2">
                            <Input
                                value={url}
                                readOnly
                                aria-label="Link rekap publik"
                                onFocus={(e) => e.target.select()}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copy}
                            >
                                Salin
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Buka
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => run('regenerate')}
                            >
                                Ganti link
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => run('disable')}
                            >
                                Nonaktifkan
                            </Button>
                        </div>
                    </>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => run('enable')}
                    >
                        Aktifkan link publik
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function AppSettingsPage({ settings }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        shifts: settings.shifts ?? ['Shift I', 'Shift II'],
        unit_analytics: settings.unit_analytics ?? false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/app-settings', {
            onError: () => toast.error('Gagal menyimpan pengaturan'),
        });
    };

    const addShift = () => setData('shifts', [...data.shifts, '']);
    const removeShift = (i: number) =>
        setData(
            'shifts',
            data.shifts.filter((_, idx) => idx !== i),
        );
    const updateShift = (i: number, v: string) =>
        setData(
            'shifts',
            data.shifts.map((s, idx) => (idx === i ? v : s)),
        );

    return (
        <>
            <Head title="Pengaturan Aplikasi" />
            <div className="flex max-w-2xl flex-col gap-6 px-4 pt-5 pb-8 lg:px-8 lg:pt-8">
                <div className="flex items-center gap-3">
                    <Settings2 className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.02em] max-lg:sr-only lg:text-[28px] lg:leading-[34px]">
                            Pengaturan Aplikasi
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Konfigurasi shift Form P2H dan fitur opsional
                        </p>
                    </div>
                </div>

                <PublicLinkCard url={settings.public_report_url} />

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Shifts */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Shift Kerja
                            </CardTitle>
                            <CardDescription>
                                Daftar shift yang bisa dipilih di Form P2H
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.shifts.map((shift, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2"
                                >
                                    <Input
                                        value={shift}
                                        onChange={(e) =>
                                            updateShift(i, e.target.value)
                                        }
                                        placeholder="Contoh: Shift I"
                                        className="flex-1"
                                    />
                                    <Button
                                        aria-label="Hapus shift"
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive hover:text-destructive"
                                        onClick={() => removeShift(i)}
                                        disabled={data.shifts.length <= 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {errors['shifts'] && (
                                <p className="text-sm text-destructive">
                                    {errors['shifts']}
                                </p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 gap-2"
                                onClick={addShift}
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Shift
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Fitur opsional */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Fitur Opsional
                            </CardTitle>
                            <CardDescription>
                                Fitur di luar alur utama P2H, monitoring,
                                temuan, laporan, dan PA
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    checked={data.unit_analytics}
                                    onCheckedChange={(v) =>
                                        setData('unit_analytics', v === true)
                                    }
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="text-sm font-medium">
                                        Analitik Unit
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        Efisiensi BBM, pengisian tidak wajar,
                                        dan jadwal servis berkala. Tampil
                                        sebagai tab di menu Kinerja Unit.
                                    </span>
                                </span>
                            </label>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? 'Menyimpan…' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AppSettingsPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[{ title: 'Pengaturan Aplikasi', href: '/app-settings' }]}
    >
        {page}
    </AppLayout>
);
