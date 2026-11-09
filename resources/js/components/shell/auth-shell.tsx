import type { ReactNode } from 'react';

/**
 * Bingkai layar auth gaya MyWahana (docs/screens/auth.md):
 * - Mobile: foto gunung di atas, memudar ke latar krem + motif topo.
 * - Desktop (lg+): satu kartu lebar maks 896, foto kiri, form kanan.
 * Dipakai Masuk, Lupa kata sandi, Reset, Verifikasi email, 2FA, Konfirmasi sandi.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh bg-background lg:items-center lg:justify-center lg:p-8">
            <div className="relative isolate flex w-full flex-col overflow-hidden lg:max-w-[896px] lg:flex-row lg:rounded-2xl lg:bg-card lg:shadow-lg">
                {/* Hero: foto gunung */}
                <div className="relative isolate flex h-[300px] shrink-0 flex-col justify-between px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 sm:h-[360px] lg:h-auto lg:min-h-[566px] lg:w-1/2 lg:pt-6">
                    <img
                        src="/images/hero-mountain.jpg"
                        alt="Gunung berhutan di bawah langit cerah"
                        className="absolute inset-0 -z-20 size-full object-cover object-center"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_55%,var(--background)_100%)] lg:bg-none"
                    />
                    <div className="flex items-center gap-2.5 self-start rounded-full bg-white/90 py-1.5 pr-3.5 pl-1.5">
                        <img
                            src="/images/pims-logo.png"
                            alt=""
                            className="size-[30px]"
                        />
                        <span className="text-xs font-extrabold tracking-[0.1em] text-black">
                            PIMS
                        </span>
                    </div>
                </div>

                {/* Form */}
                <div className="relative isolate flex flex-1 flex-col overflow-hidden px-6 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:justify-center lg:px-10 lg:py-11">
                    <img
                        src="/images/topo-motif-mw.png"
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute -right-[300px] -bottom-[140px] -z-10 w-[760px] max-w-none opacity-45 mix-blend-multiply dark:opacity-15 dark:mix-blend-screen dark:invert"
                    />
                    {children}
                </div>
            </div>
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
        <div className="mb-4">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em]">
                {title}
            </h1>
            {description && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}
