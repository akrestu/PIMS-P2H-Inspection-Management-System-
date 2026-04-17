import { useAppearance } from '@/hooks/use-appearance';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { resolvedAppearance } = useAppearance();

    return (
        <Sonner
            theme={resolvedAppearance}
            className="toaster group"
            position="top-right"
            richColors
            closeButton
            expand={false}
            visibleToasts={5}
            toastOptions={{
                classNames: {
                    toast: 'rounded-xl border shadow-lg text-sm font-medium',
                    title: 'font-semibold text-sm',
                    description: 'text-xs mt-0.5 opacity-80',
                    actionButton: 'text-xs font-semibold',
                    cancelButton: 'text-xs',
                    closeButton: 'opacity-60 hover:opacity-100 transition-opacity',
                },
            }}
            icons={{
                success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                error:   <XCircle      className="h-4 w-4 text-red-500" />,
                warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                info:    <Info         className="h-4 w-4 text-blue-500" />,
                loading: <Loader2      className="h-4 w-4 animate-spin text-muted-foreground" />,
            }}
            style={
                {
                    '--normal-bg':     'var(--popover)',
                    '--normal-text':   'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
