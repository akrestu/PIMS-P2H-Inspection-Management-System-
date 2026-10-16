import { Head, Link } from '@inertiajs/react';
import { useShellNavigation } from '@/components/shell/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    unit: string;
    sessionId: number;
    layak: boolean;
    /** Nama PIC bila entry menunggu persetujuan. */
    pic: string | null;
    critical: boolean;
    findings: string[];
}

/**
 * Layar "P2H terkirim" (docs/screens/driver.md §7): lingkaran pop + centang/silang
 * digambar (stroke-dashoffset; mati bila "Kurangi gerakan"), hasil, temuan, PIC.
 */
export default function P2hSubmitted({
    unit,
    sessionId,
    layak,
    pic,
    critical,
    findings,
}: Props) {
    const { homeHref } = useShellNavigation();

    return (
        <>
            <Head title="P2H terkirim" />
            <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
                <div
                    className={cn(
                        'grid size-28 animate-pop place-items-center rounded-full',
                        layak
                            ? 'bg-success-soft text-success'
                            : 'bg-danger-soft text-danger',
                    )}
                >
                    <svg viewBox="0 0 52 52" className="size-16" aria-hidden>
                        <path
                            d={
                                layak
                                    ? 'M14 27 L23 36 L39 18'
                                    : 'M17 17 L35 35 M35 17 L17 35'
                            }
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="[stroke-dasharray:60] [stroke-dashoffset:60] motion-safe:animate-[pims-draw_500ms_var(--ease-out)_250ms_forwards] motion-reduce:[stroke-dashoffset:0]"
                        />
                    </svg>
                </div>
                <div className="space-y-2" role="status">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em]">
                        P2H terkirim · {layak ? 'Layak Pakai' : 'Tidak Layak'}
                    </h1>
                    <p className="text-[15px] text-muted-foreground">
                        {layak
                            ? `${unit} siap dioperasikan.`
                            : `${unit} tercatat BD. Pengawas sudah diberi tahu.`}
                    </p>
                    {critical && layak && (
                        <p className="text-[15px] font-medium text-danger">
                            Ada item kritis (AA) Tidak Layak. Admin sudah diberi
                            tahu.
                        </p>
                    )}
                    {pic && (
                        <p className="text-[15px] text-muted-foreground">
                            Diteruskan ke{' '}
                            <span className="font-semibold text-foreground">
                                {pic}
                            </span>{' '}
                            untuk persetujuan.
                        </p>
                    )}
                </div>
                {findings.length > 0 && (
                    <ul className="w-full max-w-sm divide-y rounded-[14px] border-(length:--bw) bg-card text-left">
                        <li className="px-4 py-2.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                            {findings.length} temuan Tidak Layak
                        </li>
                        {findings.map((f) => (
                            <li
                                key={f}
                                className="flex items-center gap-2 px-4 py-2.5 text-[15px]"
                            >
                                <span
                                    className="size-1.5 shrink-0 rounded-full bg-danger"
                                    aria-hidden
                                />
                                {f}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Button asChild size="xl">
                        <Link href={homeHref}>Kembali ke Beranda</Link>
                    </Button>
                    <Button asChild variant="outline" size="xl">
                        <Link href={`/p2h/${sessionId}`}>Lihat detail P2H</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

P2hSubmitted.layout = {
    breadcrumbs: [{ title: 'P2H terkirim', href: '/p2h' }],
};
