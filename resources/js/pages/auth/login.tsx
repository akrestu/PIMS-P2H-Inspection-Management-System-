import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="PIMS — Masuk" />
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <LoginForm canResetPassword={canResetPassword} status={status} />
                </div>
            </div>
        </>
    );
}

Login.layout = null;
