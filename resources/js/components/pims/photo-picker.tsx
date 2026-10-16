import { AlertCircle, Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MAX_MB = 15;

/**
 * PhotoCapture (docs/02): ambil kamera / galeri · memproses · pratinjau · gagal.
 * Kompresi dilakukan pemanggil (`onFiles`); komponen ini menyaring file yang
 * bukan gambar atau terlalu besar dan menampilkan pesannya di tempat.
 */
export function PhotoPicker({
    previews,
    processing = false,
    onFiles,
    onRemove,
    multiple = true,
    compact = false,
    className,
}: {
    previews: string[];
    processing?: boolean;
    onFiles: (files: FileList) => void;
    onRemove: (index: number) => void;
    multiple?: boolean;
    /** Tombol lebih kecil untuk lampiran per item checklist. */
    compact?: boolean;
    className?: string;
}) {
    const [error, setError] = useState<string | null>(null);

    const accept = (list: FileList | null) => {
        if (!list || list.length === 0) {
            return;
        }

        const rejected = Array.from(list).filter(
            (f) =>
                !f.type.startsWith('image/') || f.size > MAX_MB * 1024 * 1024,
        );

        if (rejected.length > 0) {
            setError(
                `${rejected.length} file gagal: hanya foto (JPG/PNG) maksimal ${MAX_MB} MB. Coba lagi.`,
            );
        } else {
            setError(null);
        }

        if (rejected.length < list.length) {
            const dt = new DataTransfer();
            Array.from(list)
                .filter((f) => !rejected.includes(f))
                .forEach((f) => dt.items.add(f));
            onFiles(dt.files);
        }
    };

    const btn = cn(
        'flex press cursor-pointer items-center justify-center gap-2 rounded-[12px] border-(length:--bw) border-dashed border-input text-sm font-medium text-foreground hover:bg-muted',
        compact ? 'h-11 px-4' : 'h-12',
        processing && 'pointer-events-none opacity-40',
    );

    return (
        <div className={cn('space-y-3', className)}>
            <div
                className={cn(
                    'gap-2',
                    compact ? 'flex flex-wrap' : 'grid grid-cols-2',
                )}
            >
                {/* label + input asli agar capture kamera andal di mobile */}
                <label className={btn}>
                    <Camera className="size-4" aria-hidden />
                    Ambil foto
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={processing}
                        className="sr-only"
                        onChange={(e) => {
                            accept(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </label>
                <label className={btn}>
                    <ImagePlus className="size-4" aria-hidden />
                    Galeri
                    <input
                        type="file"
                        accept="image/*"
                        multiple={multiple}
                        disabled={processing}
                        className="sr-only"
                        onChange={(e) => {
                            accept(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </label>
            </div>

            <div aria-live="polite">
                {processing && (
                    <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Memproses foto (dikompres ± 300 KB)…
                    </p>
                )}
                {error && (
                    <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger hc:border-2 hc:border-danger">
                        <AlertCircle
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        {error}
                    </p>
                )}
            </div>

            {previews.length > 0 && (
                <ul
                    className={cn(
                        'grid gap-3',
                        compact ? 'grid-cols-4' : 'grid-cols-3',
                    )}
                >
                    {previews.map((src, idx) => (
                        <li key={src} className="relative aspect-square">
                            <img
                                src={src}
                                alt={`Foto ${idx + 1}`}
                                className="size-full rounded-[12px] border-(length:--bw) object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
                                aria-label={`Hapus foto ${idx + 1}`}
                                className="absolute -top-2 -right-2 grid size-8 press place-items-center rounded-full bg-ink text-ink-foreground shadow-md"
                            >
                                <X className="size-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
