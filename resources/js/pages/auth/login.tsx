import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="PIMS — Masuk" />
            <div className="flex min-h-svh flex-col items-center justify-center bg-primary md:bg-muted md:p-10">
                {/* Brand panel — tampil di mobile saja, desktop pakai CardHeader */}
                <div className="flex flex-col items-center justify-center gap-4 px-8 pb-6 pt-10 text-primary-foreground md:hidden">
                    <img
                        src="/logo.png"
                        alt="PIMS Logo"
                        className="h-20 w-20 object-contain"
                    />
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight">PIMS</h1>
                        <p className="mt-1 text-sm/relaxed opacity-80">
                            P2H &amp; Inspection Management System
                        </p>
                    </div>
                </div>

                {/* Form card */}
                <Card className="w-full max-w-sm rounded-xl border-0 shadow-none md:border md:shadow-sm">
                    {/* Logo + judul hanya di desktop */}
                    <CardHeader className="hidden flex-col items-center text-center md:flex">
                        <img
                            src="/logo.png"
                            alt="PIMS Logo"
                            className="mb-2 h-10 w-10 object-contain"
                        />
                        <CardTitle>PIMS</CardTitle>
                        <CardDescription>P2H &amp; Inspection Management System</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-8 md:pt-2">
                        <LoginForm status={status} />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Login.layout = null;
