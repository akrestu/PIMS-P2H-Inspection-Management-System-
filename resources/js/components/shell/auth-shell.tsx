import type { ReactNode } from 'react';

/**
 * Bingkai layar auth — diselaraskan dengan MyWahana:
 * - Mobile: foto unit 300px di atas, form di bawahnya.
 * - Desktop (lg+): kartu dua kolom (foto kiri, form kanan) di tengah layar.
 * Dipakai Masuk, Lupa kata sandi, Reset, Verifikasi email, 2FA, Konfirmasi sandi.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh bg-card lg:items-center lg:justify-center lg:bg-background lg:p-8">
            <div className="relative isolate flex w-full flex-col overflow-hidden bg-card lg:max-w-4xl lg:flex-row lg:rounded-[28px] lg:shadow-[0_24px_60px_oklch(0.191_0_0/0.10)] hc:lg:border-2">
                {/* Hero: unit excavator */}
                <div className="relative isolate flex h-[300px] shrink-0 flex-col justify-between px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 sm:h-[360px] lg:h-auto lg:min-h-[560px] lg:w-1/2 lg:pt-6">
                    <img
                        src="/images/login-excavator.jpg"
                        alt="Unit excavator di area tambang"
                        className="absolute inset-0 -z-20 size-full object-cover object-[55%_50%]"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0_0_0/0.30)_0%,transparent_40%,var(--card)_100%)] lg:bg-[linear-gradient(180deg,oklch(0_0_0/0.30)_0%,transparent_45%)]"
                    />
                    <div className="flex items-center gap-2.5 self-start rounded-full bg-white/90 py-1.5 pr-3.5 pl-1.5">
                        <img
                            src="/images/logo-256.png"
                            alt="Logo PT.WBK"
                            className="size-[30px]"
                        />
                        <span className="text-xs font-extrabold tracking-[0.1em] text-black">
                            PIMS
                        </span>
                    </div>
                </div>

                {/* Form */}
                <div className="relative isolate flex flex-1 flex-col overflow-hidden px-6 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:justify-center lg:p-10">
                    <img
                        src="/images/topo.png"
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute -right-[300px] -bottom-[140px] -z-10 w-[760px] max-w-none opacity-35 dark:opacity-15 dark:invert"
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
            <h1 className="text-[28px] font-extrabold tracking-tight">
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
