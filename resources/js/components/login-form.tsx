import { Form } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

interface LoginFormProps {
    canResetPassword?: boolean;
    status?: string;
}

export function LoginForm({ canResetPassword, status }: LoginFormProps) {
    return (
        <div className="flex flex-col items-center gap-8">
            {/* Brand header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">Selamat Datang di PIMS</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    P2H &amp; Inspection Management System
                </p>
            </div>

            <Separator className="w-full" />

            {/* Form */}
            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex w-full flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        {/* NIK */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="nik" className="text-center text-sm">
                                NIK
                            </Label>
                            <Input
                                id="nik"
                                type="text"
                                name="nik"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="username"
                                placeholder="Nomor Induk Karyawan"
                                className="h-11 w-full text-center tracking-widest"
                                inputMode="numeric"
                            />
                            <InputError message={errors.nik} className="text-center" />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password" className="text-center text-sm">
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="h-11 w-full text-center"
                            />
                            <InputError message={errors.password} className="text-center" />
                            {canResetPassword && (
                                <div className="text-center">
                                    <TextLink
                                        href={request()}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        tabIndex={5}
                                    >
                                        Lupa password?
                                    </TextLink>
                                </div>
                            )}
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center justify-center gap-2.5 py-1">
                            <Checkbox id="remember" name="remember" tabIndex={3} />
                            <Label
                                htmlFor="remember"
                                className="cursor-pointer font-normal text-muted-foreground"
                            >
                                Ingat saya
                            </Label>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            tabIndex={4}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Memproses…
                                </>
                            ) : (
                                'Masuk'
                            )}
                        </Button>
                    </>
                )}
            </Form>

            {/* Status message */}
            {status && (
                <p className="text-center text-sm font-medium text-green-600 dark:text-green-400">
                    {status}
                </p>
            )}
        </div>
    );
}
