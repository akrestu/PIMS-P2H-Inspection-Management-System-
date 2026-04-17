import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Teks label yang ditampilkan di fallback UI, misal "grafik" atau "tabel". */
    label?: string;
}

interface State {
    hasError: boolean;
    message: string | null;
}

/**
 * Tangkap error render-time pada komponen child.
 * Gunakan untuk membungkus komponen chart / tabel di dashboard
 * agar satu komponen yang crash tidak memblank seluruh halaman.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, message: null });
    };

    render() {
        if (this.state.hasError) {
            const label = this.props.label ?? 'komponen';
            return (
                <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive/80">
                    <AlertTriangle className="h-5 w-5 text-destructive/60" />
                    <p className="font-medium">Gagal memuat {label}</p>
                    {this.state.message && (
                        <p className="text-xs text-muted-foreground">{this.state.message}</p>
                    )}
                    <button
                        onClick={this.handleRetry}
                        className="mt-1 text-xs underline underline-offset-2 hover:text-destructive"
                    >
                        Coba lagi
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
