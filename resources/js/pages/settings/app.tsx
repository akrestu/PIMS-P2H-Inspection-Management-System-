import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Trash2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    settings: {
        shifts: string[];
    };
}

export default function AppSettingsPage({ settings }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        shifts: settings.shifts ?? ['Shift I', 'Shift II'],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/app-settings', {
            onError: () => toast.error('Gagal menyimpan pengaturan'),
        });
    };

    const addShift = () => setData('shifts', [...data.shifts, '']);
    const removeShift = (i: number) => setData('shifts', data.shifts.filter((_, idx) => idx !== i));
    const updateShift = (i: number, v: string) => setData('shifts', data.shifts.map((s, idx) => idx === i ? v : s));

    return (
        <>
            <Head title="Pengaturan Aplikasi" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
                <div className="flex items-center gap-3">
                    <Settings2 className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h1 className="text-xl font-bold">Pengaturan Aplikasi</h1>
                        <p className="text-sm text-muted-foreground">Konfigurasi shift yang tersedia di Form P2H</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Shifts */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Shift Kerja</CardTitle>
                            <CardDescription>Daftar shift yang bisa dipilih di Form P2H</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.shifts.map((shift, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        value={shift}
                                        onChange={(e) => updateShift(i, e.target.value)}
                                        placeholder="Contoh: Shift I"
                                        className="flex-1"
                                    />
                                    <Button
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
                                <p className="text-sm text-destructive">{errors['shifts']}</p>
                            )}
                            <Button type="button" variant="outline" size="sm" className="gap-2 mt-2" onClick={addShift}>
                                <Plus className="h-4 w-4" />
                                Tambah Shift
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} className="gap-2">
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
    <AppLayout breadcrumbs={[{ title: 'Pengaturan Aplikasi', href: '/app-settings' }]}>{page}</AppLayout>
);
