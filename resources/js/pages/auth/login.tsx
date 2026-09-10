import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="PIMS — Masuk" />

            <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/50 p-4 sm:p-6">
                <div
                    aria-hidden="true"
                    className="absolute -top-32 -left-28 size-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/5"
                />
                <div
                    aria-hidden="true"
                    className="absolute -right-24 -bottom-36 size-96 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/5"
                />

                <Card className="relative w-full max-w-sm rounded-3xl border-border/60 px-2 py-8 shadow-sm sm:py-10">
                    <CardContent>
                        <LoginForm status={status} />
                    </CardContent>
                </Card>
            </main>
        </>
    );
}

Login.layout = null;
