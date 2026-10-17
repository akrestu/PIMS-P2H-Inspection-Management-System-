import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';
import { AuthShell } from '@/components/shell/auth-shell';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Masuk" />
            <AuthShell>
                <LoginForm status={status} />
            </AuthShell>
        </>
    );
}

Login.layout = null;
