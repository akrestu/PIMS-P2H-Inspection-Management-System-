import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';

type Props = {
    status?: string;
};

/**
 * Layar masuk — tata letak diselaraskan dengan MyWahana:
 * mobile = hero foto di atas + form; desktop = kartu dua kolom.
 */
export default function Login({ status }: Props) {
    return (
        <div className="flex min-h-svh bg-card lg:items-center lg:justify-center lg:bg-background lg:p-8">
            <Head title="Masuk" />

            <div className="relative isolate flex w-full flex-col overflow-hidden bg-card lg:max-w-4xl lg:flex-row lg:rounded-[28px] lg:shadow-[0_24px_60px_oklch(0.191_0_0/0.10)]">
                {/* Hero: unit excavator */}
                <div className="relative isolate flex h-[300px] shrink-0 flex-col justify-between px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 sm:h-[360px] lg:h-auto lg:w-1/2 lg:pt-6">
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
                            src="/logo.png"
                            alt="Logo PT.WBK"
                            className="size-[30px]"
                        />
                        <span className="text-xs font-extrabold tracking-[0.1em] text-neutral-900">
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
                    <LoginForm status={status} />
                </div>
            </div>
        </div>
    );
}

Login.layout = null;
