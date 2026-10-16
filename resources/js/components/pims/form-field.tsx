import type { ReactElement, ReactNode } from 'react';
import { cloneElement, useId } from 'react';
import { cn } from '@/lib/utils';

type FieldControlProps = {
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
};

/**
 * FormField (docs/02#formfield): label di atas · kontrol · pesan error/hint di bawah.
 * Menyambungkan `id`, `aria-invalid`, `aria-describedby` ke kontrol anak secara otomatis.
 */
export function FormField({
    label,
    hint,
    error,
    required = false,
    trailing,
    children,
    className,
}: {
    label: ReactNode;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    /** Teks kecil di kanan label, mis. "Belum dijawab". */
    trailing?: ReactNode;
    children: ReactElement<FieldControlProps>;
    className?: string;
}) {
    const autoId = useId();
    const id = children.props.id ?? autoId;
    const messageId = id + '-msg';
    const hasMessage = Boolean(error || hint);

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-sm font-medium">
                    {label}
                    {required && (
                        <span className="ml-0.5 text-danger" aria-hidden>
                            *
                        </span>
                    )}
                </label>
                {trailing && (
                    <span className="text-xs text-muted-foreground">
                        {trailing}
                    </span>
                )}
            </div>
            {cloneElement(children, {
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': hasMessage ? messageId : undefined,
            })}
            {error ? (
                <p
                    id={messageId}
                    className="text-[13px] font-medium text-danger"
                >
                    {error}
                </p>
            ) : hint ? (
                <p id={messageId} className="text-[13px] text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
