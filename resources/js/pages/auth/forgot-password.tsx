import { Head } from '@inertiajs/react';
import { MessageCircle, Phone } from 'lucide-react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { login } from '@/routes';

const WA_NUMBER = '085156650598';
const WA_LINK = `https://wa.me/62${WA_NUMBER.replace(/^0/, '')}?text=${encodeURIComponent('Halo Tim IT, saya membutuhkan bantuan untuk reset password akun PIMS saya.')}`;

export default function ForgotPassword() {
    return (
        <>
            <Head title="PIMS — Lupa Password" />

            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center gap-8">
                        {/* Header */}
                        <div className="text-center">
                            <h1 className="text-2xl font-bold tracking-tight">Lupa Password?</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                P2H &amp; Inspection Management System
                            </p>
                        </div>

                        <Separator className="w-full" />

                        {/* Info */}
                        <div className="flex w-full flex-col items-center gap-6 text-center">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Reset password hanya dapat dilakukan oleh{' '}
                                <span className="font-semibold text-foreground">Tim IT</span>{' '}
                                PT. Wahana Bandhawa Kencana. Silakan hubungi kami melalui WhatsApp di bawah ini.
                            </p>

                            {/* WhatsApp Button */}
                            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="w-full">
                                <Button size="lg" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                                    <MessageCircle className="size-5" />
                                    Chat WhatsApp Tim IT
                                </Button>
                            </a>

                            {/* Number display */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="size-4 shrink-0" />
                                <span>{WA_NUMBER}</span>
                            </div>
                        </div>

                        <Separator className="w-full" />

                        {/* Back to login */}
                        <p className="text-sm text-muted-foreground">
                            Sudah ingat password?{' '}
                            <TextLink href={login()} className="font-medium">
                                Kembali ke halaman masuk
                            </TextLink>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = null;
