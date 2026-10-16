import { Maximize2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    onEnd?: () => void;
    onClear?: () => void;
    sigPadRef: React.RefObject<ReactSignatureCanvas | null>;
    /** Warna tinta (disimpan dalam gambar). Default gelap; approver memakai biru. */
    penColor?: string;
}

export default function SignaturePad({
    onEnd,
    onClear,
    sigPadRef,
    penColor = '#1e293b',
}: Props) {
    const [hasSig, setHasSig] = useState(false);
    const [full, setFull] = useState(false);
    const savedDataUrl = useRef<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const restoreSignature = useCallback(() => {
        if (!savedDataUrl.current || !sigPadRef.current) {
            return;
        }

        const canvas = sigPadRef.current.getCanvas();
        // re-draw setelah browser selesai layout
        requestAnimationFrame(() => {
            if (!savedDataUrl.current || !sigPadRef.current) {
                return;
            }

            sigPadRef.current.fromDataURL(savedDataUrl.current, {
                width: canvas.offsetWidth,
                height: canvas.offsetHeight,
            });
        });
    }, [sigPadRef]);

    const handleEnd = () => {
        savedDataUrl.current =
            sigPadRef.current?.toDataURL('image/png') ?? null;
        setHasSig(true);
        onEnd?.();
    };

    const handleClear = () => {
        sigPadRef.current?.clear();
        savedDataUrl.current = null;
        setHasSig(false);
        onClear?.();
    };

    useEffect(() => {
        // ResizeObserver: canvas resize (viewport height berubah saat address bar mobile muncul/hilang)
        const observer = containerRef.current
            ? new ResizeObserver(restoreSignature)
            : null;

        if (containerRef.current && observer) {
            observer.observe(containerRef.current);
        }

        // scroll: Chrome Android bisa clear canvas saat di-scroll off-screen
        const onScroll = () => restoreSignature();
        // visibilitychange: tab background/foreground
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                restoreSignature();
            }
        };
        // pageshow: kembali dari bfcache
        const onPageShow = () => restoreSignature();

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pageshow', onPageShow);

        return () => {
            observer?.disconnect();
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, [restoreSignature]);

    // Layar penuh: Esc menutup, scroll halaman dikunci
    useEffect(() => {
        if (!full) {
            return;
        }

        const onKey = (e: KeyboardEvent) =>
            e.key === 'Escape' && setFull(false);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [full]);

    return (
        <div
            className={cn(
                full
                    ? 'fixed inset-0 z-50 flex flex-col gap-3 bg-background p-4 pb-[max(env(safe-area-inset-bottom),16px)]'
                    : 'space-y-3',
            )}
            role={full ? 'dialog' : undefined}
            aria-modal={full || undefined}
            aria-label={full ? 'Tanda tangan layar penuh' : undefined}
        >
            {full && (
                <p className="text-sm font-semibold">
                    Tanda tangan di area putih, lalu tekan Selesai.
                </p>
            )}
            {/* Area kanvas — selalu putih karena tanda tangan disimpan sebagai gambar bertinta gelap */}
            <div
                ref={containerRef}
                className={cn(
                    'relative overflow-hidden rounded-xl border-(length:--bw) bg-white',
                    hasSig ? 'border-foreground' : 'border-dashed border-input',
                    full && 'flex-1',
                )}
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 bottom-10 border-t-2 border-dashed border-black/15"
                />
                {!hasSig && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-black/40">
                        Tanda tangan di sini
                    </span>
                )}
                <ReactSignatureCanvas
                    ref={sigPadRef as React.RefObject<ReactSignatureCanvas>}
                    penColor={penColor}
                    minWidth={1.6}
                    maxWidth={3}
                    canvasProps={{
                        className: 'w-full',
                        style: {
                            height: full ? '100%' : '180px',
                            touchAction: 'none',
                            display: 'block',
                        },
                    }}
                    onEnd={handleEnd}
                />
            </div>

            {/* Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                    className="text-[13px] text-muted-foreground"
                    aria-live="polite"
                >
                    {hasSig ? (
                        <span className="font-medium text-success">
                            Tanda tangan tersimpan
                        </span>
                    ) : (
                        'Gunakan jari atau mouse untuk menandatangani'
                    )}
                </p>
                <div className="flex gap-2">
                    {hasSig && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClear}
                        >
                            <RotateCcw />
                            Ulangi
                        </Button>
                    )}
                    {full ? (
                        <Button type="button" onClick={() => setFull(false)}>
                            Selesai
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFull(true)}
                        >
                            <Maximize2 />
                            Layar penuh
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
