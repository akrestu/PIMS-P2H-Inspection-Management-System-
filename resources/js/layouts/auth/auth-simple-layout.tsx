import { AuthHeading, AuthShell } from '@/components/shell/auth-shell';
import type { AuthLayoutProps } from '@/types';

/** Layout layar auth lain (reset, verifikasi email, 2FA, konfirmasi sandi) — bingkai sama dengan Masuk. */
export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <AuthShell>
            {title && <AuthHeading title={title} description={description} />}
            {children}
        </AuthShell>
    );
}
