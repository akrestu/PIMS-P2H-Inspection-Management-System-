import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';

interface Props {
    onEnd?: () => void;
    onClear?: () => void;
    sigPadRef: React.RefObject<ReactSignatureCanvas | null>;
}

export default function SignaturePad({ onEnd, onClear, sigPadRef }: Props) {
    const [hasSig, setHasSig] = useState(false);
    const savedDataUrl = useRef<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleEnd = () => {
        savedDataUrl.current = sigPadRef.current?.toDataURL('image/png') ?? null;
        setHasSig(true);
        onEnd?.();
    };

    const handleClear = () => {
        sigPadRef.current?.clear();
        savedDataUrl.current = null;
        setHasSig(false);
        onClear?.();
    };

    // Restore signature after canvas is resized (mobile viewport changes clear the canvas)
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            if (savedDataUrl.current && sigPadRef.current) {
                sigPadRef.current.fromDataURL(savedDataUrl.current, {
                    width: sigPadRef.current.getCanvas().offsetWidth,
                    height: sigPadRef.current.getCanvas().offsetHeight,
                });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [sigPadRef]);

    return (
        <div className="space-y-3">
            {/* Canvas area */}
            <div
                ref={containerRef}
                className={cn(
                    'relative rounded-xl border-2 border-dashed transition-colors overflow-hidden',
                    hasSig ? 'border-primary bg-white dark:bg-gray-950' : 'border-muted-foreground/30 bg-muted/20',
                )}
            >
                {!hasSig && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.181 3.182L7.5 19.212l-4.5 1 1-4.5L16.862 3.487z" />
                        </svg>
                        <span className="text-xs">Tanda tangan di sini</span>
                    </div>
                )}
                <ReactSignatureCanvas
                    ref={sigPadRef as React.RefObject<ReactSignatureCanvas>}
                    penColor="#1e293b"
                    canvasProps={{
                        className: 'w-full',
                        style: { height: '160px', touchAction: 'none', display: 'block' },
                    }}
                    onEnd={handleEnd}
                />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {hasSig ? (
                        <span className="font-medium text-green-600 dark:text-green-400">Tanda tangan tersimpan</span>
                    ) : (
                        'Gunakan jari atau mouse untuk menandatangani'
                    )}
                </p>
                {hasSig && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="h-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Ulangi
                    </Button>
                )}
            </div>
        </div>
    );
}
