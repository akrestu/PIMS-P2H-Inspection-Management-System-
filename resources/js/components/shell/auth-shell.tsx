import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const FOOTER = 'PIMS v1.0 · masuk tercatat di Audit Log';

/**
 * Bingkai layar auth (docs/screens/auth.md):
 * - Mobile/tablet (< lg): gaya "Hero" — foto alat berat 300px + form menimpa foto.
 * - Desktop (lg+): kartu kaca terpusat di atas motif topo layar penuh, mengikuti tema.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    const { server } = usePage<{
        server?: { time: string; tz: string; shift: number };
    }>().props;

    return (
        <div className="min-h-svh bg-background lg:relative lg:grid lg:place-items-center lg:overflow-hidden lg:bg-[var(--auth-bg)] lg:p-8">
            {/* Mobile hero */}
            <div className="relative h-[300px] overflow-hidden lg:hidden">
                <img
                    src="/login-hero.jpg"
                    alt=""
                    className="absolute inset-0 size-full object-cover object-[58%_40%]"
                />
                <div
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-background"
                />
                <div className="relative flex items-center justify-between p-5 text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)]">
                    <span className="flex items-center gap-2">
                        <img src="/logo.png" alt="" className="size-[34px]" />
                        <span className="text-lg font-bold">PIMS</span>
                    </span>
                    <span className="text-[13px] font-medium">
                        P2H unit &amp; alat berat
                    </span>
                </div>
            </div>

            {/* Desktop: logo kiri atas + pill shift & jam server kanan atas */}
            <header className="absolute inset-x-0 top-0 z-10 hidden items-center justify-between p-10 lg:flex">
                <span className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="" className="size-8" />
                    <span className="text-lg font-bold">PIMS</span>
                </span>
                {server && (
                    <span className="inline-flex h-8 items-center gap-2 rounded-full border-(length:--bw) bg-[var(--auth-card)] px-3.5 text-xs text-muted-foreground tnum backdrop-blur">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                            <span className="relative inline-flex size-2 rounded-full bg-success" />
                        </span>
                        Shift {server.shift} · {server.time} {server.tz}
                    </span>
                )}
            </header>

            {/* Desktop topo */}
            <img
                src="/topo-motif.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden size-full object-cover opacity-[var(--auth-topo-opacity)] lg:block"
            />

            <div className="relative -mt-16 rounded-t-[28px] bg-background px-6 pt-8 pb-8 lg:mt-0 lg:w-full lg:max-w-[440px] lg:rounded-[28px] lg:border-(length:--bw) lg:border-[var(--auth-card-border)] lg:bg-[var(--auth-card)] lg:p-9 lg:shadow-[var(--auth-card-shadow)] lg:backdrop-blur-[24px] lg:backdrop-saturate-[1.4] hc:lg:border-2">
                <div className="mx-auto w-full max-w-[400px]">{children}</div>
            </div>

            <p className="px-6 pb-8 text-center text-xs text-muted-foreground lg:absolute lg:inset-x-0 lg:bottom-6 lg:pb-0">
                {FOOTER}
            </p>
        </div>
    );
}

/** Judul + deskripsi standar layar auth. */
export function AuthHeading({
    title,
    description,
}: {
    title: string;
    description?: ReactNode;
}) {
    return (
        <div className="mb-6">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] lg:text-[30px]">
                {title}
            </h1>
            {description && (
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}
