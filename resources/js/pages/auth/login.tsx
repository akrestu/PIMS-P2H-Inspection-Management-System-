import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="PIMS — Masuk" />
            <div className="flex min-h-svh">
                {/* Panel kiri — hanya tampil di desktop */}
                <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between bg-zinc-900 text-white p-12">
                    {/* Top: Logo + brand */}
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="PIMS Logo" className="size-8 object-contain" />
                        <span className="text-lg font-semibold tracking-wide">PIMS</span>
                    </div>

                    {/* Center: Brand hero */}
                    <div className="flex flex-col gap-4">
                        <h1 className="text-4xl font-bold tracking-tight leading-snug">
                            P2H &amp; Inspection<br />Management System
                        </h1>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Sistem manajemen inspeksi dan P2H terintegrasi untuk memastikan keselamatan operasional.
                        </p>
                    </div>

                    {/* Bottom: copyright */}
                    <p className="text-xs text-zinc-500">© 2025 PIMS. All rights reserved.</p>
                </div>

                {/* Panel kanan — form */}
                <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
                    {/* Logo mobile (tersembunyi di desktop) */}
                    <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
                        <img src="/logo.png" alt="PIMS Logo" className="size-14 object-contain" />
                        <span className="text-xl font-bold tracking-wide">PIMS</span>
                    </div>

                    {/* Form */}
                    <div className="w-full max-w-sm">
                        <LoginForm status={status} />
                    </div>
                </div>
            </div>
        </>
    );
}

Login.layout = null;
