import { Form } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

const GREETINGS = [
    'Selamat datang!',
    'Welcome!',
    'Sugeng rawuh!',
    'Wilujeng sumping!',
];

const TYPING_SPEED = 65;
const DELETING_SPEED = 35;
const PAUSE_AFTER_TYPE = 1800;
const PAUSE_AFTER_DELETE = 350;

function useTypingGreeting(words: string[]) {
    const [prefersReducedMotion] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const [displayed, setDisplayed] = useState(
        prefersReducedMotion ? words[0] : '',
    );
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        if (prefersReducedMotion) {
            return;
        }

        const currentWord = words[wordIndex];
        const wordIsComplete = displayed === currentWord;
        const wordIsDeleted = displayed === '';

        const delay = wordIsComplete
            ? PAUSE_AFTER_TYPE
            : isDeleting && wordIsDeleted
              ? PAUSE_AFTER_DELETE
              : isDeleting
                ? DELETING_SPEED
                : TYPING_SPEED;

        timeoutRef.current = setTimeout(() => {
            if (!isDeleting && wordIsComplete) {
                setIsDeleting(true);

                return;
            }

            if (isDeleting && wordIsDeleted) {
                setIsDeleting(false);
                setWordIndex((index) => (index + 1) % words.length);

                return;
            }

            setDisplayed(
                isDeleting
                    ? currentWord.slice(0, displayed.length - 1)
                    : currentWord.slice(0, displayed.length + 1),
            );
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [displayed, isDeleting, prefersReducedMotion, wordIndex, words]);

    return displayed;
}

interface LoginFormProps {
    status?: string;
}

export function LoginForm({ status }: LoginFormProps) {
    const greeting = useTypingGreeting(GREETINGS);
    const [remember, setRemember] = useState(false);

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-3">
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl">
                    <img
                        src="/logo.png"
                        alt="Logo PIMS"
                        className="size-14 object-contain"
                    />
                </div>
                <span className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                    PIMS
                </span>
            </div>

            <div className="space-y-1.5 text-center">
                <h1
                    className="inline-flex min-h-9 items-center text-3xl font-semibold tracking-tight text-foreground"
                    aria-label="Selamat datang!"
                >
                    <span aria-hidden="true">{greeting}</span>
                    <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-[1.15em] w-0.5 animate-pulse rounded-full bg-foreground align-middle motion-reduce:hidden"
                    />
                </h1>
                <p className="text-sm text-muted-foreground">
                    Masuk menggunakan NIK karyawan
                </p>
            </div>

            {status && (
                <div
                    role="status"
                    className="w-full rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                    {status}
                </div>
            )}

            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password']}
                className="w-full space-y-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="nik"
                                className="block text-center text-xs font-medium tracking-wider text-muted-foreground uppercase"
                            >
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
                                inputMode="numeric"
                                placeholder="Nomor Induk Karyawan"
                                className="h-11 rounded-xl border-0 bg-muted/50 px-4 text-left focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <InputError message={errors.nik} />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="password"
                                className="block text-center text-xs font-medium tracking-wider text-muted-foreground uppercase"
                            >
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="Masukkan password"
                                className="h-11 rounded-xl border-0 bg-muted/50 px-4 pr-10 text-left focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-1">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={remember}
                                onCheckedChange={(value) =>
                                    setRemember(value === true)
                                }
                                tabIndex={3}
                            />
                            <Label
                                htmlFor="remember"
                                className="cursor-pointer text-sm font-normal text-muted-foreground"
                            >
                                Ingat saya
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-2 w-full rounded-xl"
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {processing ? 'Memproses…' : 'Masuk'}
                        </Button>
                    </>
                )}
            </Form>

            <p className="w-10/12 text-center text-xs leading-relaxed text-muted-foreground">
                Belum memiliki akses? Hubungi{' '}
                <span className="font-medium text-foreground">
                    administrator
                </span>{' '}
                untuk mendapatkan akun.
            </p>
        </div>
    );
}
