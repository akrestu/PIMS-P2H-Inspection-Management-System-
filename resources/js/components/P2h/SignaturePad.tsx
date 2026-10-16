import { Maximize2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Salin area kanvas yang berisi coretan (piksel tidak transparan) ke kanvas baru.
 * Pengganti getTrimmedCanvas() bawaan yang gagal di bundle (impor trim-canvas).
 */
function trimmedCopy(
    source: HTMLCanvasElement,
): { canvas: HTMLCanvasElement; left: number; top: number } | null {
    const ctx = source.getContext('2d');

    if (!ctx || !source.width || !source.height) {
        return null;
    }

    const { data, width, height } = ctx.getImageData(
        0,
        0,
        source.width,
        source.height,
    );
    let top = height;
    let left = width;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] !== 0) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
                left = Math.min(left, x);
                right = Math.max(right, x);
            }
        }
    }

    if (right < 0) {
        return null;
    }

    const out = document.createElement('canvas');
    out.width = right - left + 1;
    out.height = bottom - top + 1;
    out.getContext('2d')?.drawImage(
        source,
        left,
        top,
        out.width,
        out.height,
        0,
        0,
        out.width,
        out.height,
    );

    return { canvas: out, left, top };
}

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
    // Tanda tangan terakhir (sudah di-trim) untuk digambar ulang setelah kanvas berubah ukuran
    const savedSig = useRef<ReturnType<typeof trimmedCopy>>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * Samakan ukuran bitmap kanvas dengan ukuran tampilannya (× devicePixelRatio),
     * lalu gambar ulang tanda tangan tersimpan di tengah secara proporsional.
     * Tanpa ini, mode layar penuh hanya meregangkan kanvas 180px lewat CSS
     * sehingga coretan tidak jatuh di bawah jari.
     */
    const syncCanvas = useCallback(() => {
        const pad = sigPadRef.current;

        if (!pad) {
            return;
        }

        const canvas = pad.getCanvas();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = Math.round(canvas.offsetWidth * ratio);
        const h = Math.round(canvas.offsetHeight * ratio);
        const ctx = canvas.getContext('2d');

        if (!w || !h || !ctx) {
            return;
        }

        if (canvas.width !== w || canvas.height !== h) {
            // Mengubah width/height mengosongkan bitmap & transform konteks
            canvas.width = w;
            canvas.height = h;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const saved = savedSig.current;

        if (saved) {
            const { canvas: sig, left, top } = saved;

            if (left + sig.width <= w && top + sig.height <= h) {
                // Masih muat → tetap di posisi semula (tidak bergeser di bawah jari)
                ctx.drawImage(sig, left, top);
            } else {
                // Area mengecil (keluar layar penuh) → perkecil & taruh di tengah
                const pad16 = 16 * ratio;
                const scale = Math.min(
                    (w - pad16 * 2) / sig.width,
                    (h - pad16 * 2) / sig.height,
                    1,
                );
                const dw = sig.width * scale;
                const dh = sig.height * scale;
                const x = (w - dw) / 2;
                const y = (h - dh) / 2;
                ctx.drawImage(sig, x, y, dw, dh);
                // Simpan posisi barunya agar redraw berikutnya stabil
                savedSig.current = trimmedCopy(canvas);
            }
        }

        // signature_pad menggambar dalam koordinat CSS
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }, [sigPadRef]);

    const handleEnd = () => {
        const pad = sigPadRef.current;
        savedSig.current = pad ? trimmedCopy(pad.getCanvas()) : null;
        setHasSig(true);
        onEnd?.();
    };

    const handleClear = () => {
        sigPadRef.current?.clear();
        savedSig.current = null;
        setHasSig(false);
        onClear?.();
    };

    useEffect(() => {
        // ResizeObserver: canvas resize (viewport height berubah saat address bar mobile muncul/hilang)
        const observer = containerRef.current
            ? new ResizeObserver(syncCanvas)
            : null;

        if (containerRef.current && observer) {
            observer.observe(containerRef.current);
        }

        // scroll: Chrome Android bisa clear canvas saat di-scroll off-screen
        const onScroll = () => {
            if (savedSig.current) {
                syncCanvas();
            }
        };
        // visibilitychange: tab background/foreground
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                syncCanvas();
            }
        };
        // pageshow: kembali dari bfcache
        const onPageShow = () => syncCanvas();

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pageshow', onPageShow);

        return () => {
            observer?.disconnect();
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, [syncCanvas]);

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
                    // Ukuran kanvas diatur syncCanvas (ResizeObserver), bukan resize jendela
                    clearOnResize={false}
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
