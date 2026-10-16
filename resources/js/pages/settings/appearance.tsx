import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { Checkbox } from '@/components/ui/checkbox';
import { useMotionPreference } from '@/hooks/use-appearance';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    const { motion, updateMotion } = useMotionPreference();

    return (
        <>
            <Head title="Tampilan" />

            <h1 className="sr-only">Tampilan</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Tampilan"
                    description="Tema berlaku untuk perangkat ini. Kontras tinggi cocok untuk di lapangan saat terik."
                />
                <AppearanceTabs />
                <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-(length:--bw) p-4">
                    <Checkbox
                        className="mt-0.5 size-5"
                        checked={motion === 'reduced'}
                        onCheckedChange={(v) =>
                            updateMotion(v === true ? 'reduced' : 'system')
                        }
                    />
                    <span>
                        <span className="block text-sm font-medium">
                            Kurangi gerakan
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                            Matikan animasi transisi. Pengaturan sistem
                            perangkat tetap dihormati.
                        </span>
                    </span>
                </label>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Tampilan',
            href: editAppearance(),
        },
    ],
};
