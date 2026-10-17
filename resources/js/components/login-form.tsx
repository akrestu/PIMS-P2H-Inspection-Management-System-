import { Form, Link } from '@inertiajs/react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

/**
 * Form masuk NRP + kata sandi (docs/screens/auth.md · LoginNRPForm).
 * Field backend tetap `nik` (Fortify::username) — di UI disebut "NRP".
 */
const fieldShell =
    'field flex h-[50px] items-center gap-3 rounded-md border-(length:--bw) border-input bg-background px-4 transition-[border-color,box-shadow] duration-150';

export function LoginForm({ status }: { status?: string }) {
    const [nik, setNik] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [remember, setRemember] = useState(true);
    const [clientErrors, setClientErrors] = useState<{
        nik?: string;
        password?: string;
    }>({});

    const validate = (e: FormEvent<HTMLFormElement>) => {
        const next: typeof clientErrors = {};

        if (!nik) {
            next.nik = 'Masukkan NRP.';
        }

        if (!password) {
            next.password = 'Masukkan kata sandi.';
        }

        setClientErrors(next);

        if (next.nik || next.password) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById(next.nik ? 'nik' : 'password')?.focus();
        }
    };

    const trackCaps = (e: KeyboardEvent<HTMLInputElement>) =>
        setCapsLock(e.getModifierState?.('CapsLock') ?? false);

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-[28px] font-extrabold tracking-tight">
                    Masuk ke PIMS
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    Inspeksi P2H unit, cepat dan tercatat.
                </p>
            </div>

            {status && (
                <div
                    role="status"
                    className="mb-4 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
                >
                    {status}
                </div>
            )}

            <Form
                action={store.url()}
                method="post"
                resetOnError={['password']}
                onSubmitCapture={validate}
                noValidate
                className="space-y-4"
            >
                {({ processing, errors }) => {
                    // Kegagalan login & throttle dikembalikan Fortify pada field username
                    const serverError = errors.nik;

                    return (
                        <>
                            {serverError && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger hc:border-2 hc:border-danger"
                                >
                                    <AlertCircle
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden
                                    />
                                    {serverError}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="nik"
                                    className="text-[13px] font-semibold"
                                >
                                    NRP
                                </label>
                                <div
                                    className={fieldShell}
                                    data-invalid={!!clientErrors.nik}
                                >
                                    <input
                                        id="nik"
                                        name="nik"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="username"
                                        autoFocus
                                        maxLength={16}
                                        placeholder="Nomor induk, hanya angka"
                                        value={nik}
                                        onChange={(e) => {
                                            setNik(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            );
                                            setClientErrors((c) => ({
                                                ...c,
                                                nik: undefined,
                                            }));
                                        }}
                                        aria-invalid={
                                            !!clientErrors.nik || undefined
                                        }
                                        aria-describedby={
                                            clientErrors.nik
                                                ? 'nik-error'
                                                : undefined
                                        }
                                        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                                    />
                                </div>
                                {clientErrors.nik && (
                                    <p
                                        id="nik-error"
                                        className="text-[13px] font-medium text-danger"
                                    >
                                        {clientErrors.nik}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="password"
                                    className="text-[13px] font-semibold"
                                >
                                    Kata sandi
                                </label>
                                <div
                                    className={cn(fieldShell, 'pr-1.5')}
                                    data-invalid={
                                        !!clientErrors.password ||
                                        !!errors.password ||
                                        !!serverError
                                    }
                                >
                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        autoComplete="current-password"
                                        placeholder="Kata sandi"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setClientErrors((c) => ({
                                                ...c,
                                                password: undefined,
                                            }));
                                        }}
                                        onKeyDown={trackCaps}
                                        onKeyUp={trackCaps}
                                        aria-invalid={
                                            !!clientErrors.password || undefined
                                        }
                                        aria-describedby="password-msg"
                                        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((v) => !v)
                                        }
                                        aria-pressed={showPassword}
                                        aria-label={
                                            showPassword
                                                ? 'Sembunyikan kata sandi'
                                                : 'Tampilkan kata sandi'
                                        }
                                        className="grid size-11 press place-items-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-5" />
                                        ) : (
                                            <Eye className="size-5" />
                                        )}
                                    </button>
                                </div>
                                <div id="password-msg" aria-live="polite">
                                    {(clientErrors.password ||
                                        errors.password) && (
                                        <p className="text-[13px] font-medium text-danger">
                                            {clientErrors.password ??
                                                errors.password}
                                        </p>
                                    )}
                                    {capsLock && (
                                        <p className="text-[13px] font-medium text-warning">
                                            Caps Lock aktif
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-medium">
                                    <Checkbox
                                        name="remember"
                                        checked={remember}
                                        onCheckedChange={(v) =>
                                            setRemember(v === true)
                                        }
                                        value="on"
                                        className="size-5"
                                    />
                                    Ingat perangkat ini
                                </label>
                                <Link
                                    href={request()}
                                    className="text-[13px] font-semibold hover:underline"
                                >
                                    Lupa kata sandi?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                loading={processing}
                                data-test="login-button"
                            >
                                {processing ? 'Memeriksa…' : 'Masuk'}
                            </Button>
                        </>
                    );
                }}
            </Form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
                Belum punya akun atau NRP terkunci? Hubungi admin site Anda.
            </p>
        </div>
    );
}
