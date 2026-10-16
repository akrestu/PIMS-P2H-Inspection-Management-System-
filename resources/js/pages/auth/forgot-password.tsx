import { Head, usePage } from '@inertiajs/react';
import { MessageCircle, Phone } from 'lucide-react';
import { AuthHeading, AuthShell } from '@/components/shell/auth-shell';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

export default function ForgotPassword() {
    const { contact } = usePage().props;
    const waNumber = contact.wa_number;
    const waLink = `https://wa.me/62${waNumber.replace(/^0/, '')}?text=${encodeURIComponent('Halo Tim IT, saya membutuhkan bantuan untuk reset password akun PIMS saya.')}`;

    return (
        <>
            <Head title="Lupa kata sandi" />

            <AuthShell>
                <AuthHeading
                    title="Lupa kata sandi?"
                    description="Reset kata sandi dilakukan oleh Tim IT. Hubungi kami lewat WhatsApp."
                />
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Sebutkan nama dan NRP Anda saat menghubungi{' '}
                        <span className="font-semibold text-foreground">
                            Tim IT
                        </span>{' '}
                        PT. Wahana Bandhawa Kencana.
                    </p>
                    <Button
                        asChild
                        variant="brand"
                        size="xl"
                        className="w-full"
                    >
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle />
                            Chat WhatsApp Tim IT
                        </a>
                    </Button>
                    <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Phone className="size-4 shrink-0" aria-hidden />
                        {waNumber}
                    </p>
                    <p className="pt-2 text-center text-sm text-muted-foreground">
                        Sudah ingat kata sandi?{' '}
                        <TextLink href={login()} className="font-semibold">
                            Kembali ke halaman masuk
                        </TextLink>
                    </p>
                </div>
            </AuthShell>
        </>
    );
}

ForgotPassword.layout = null;
