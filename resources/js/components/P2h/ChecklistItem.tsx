import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';
import { Camera, CheckCircle2, ImagePlus, Loader2, X, XCircle } from 'lucide-react';
import RiskBadge from './RiskBadge';

interface Props {
    item: P2hInspectionItem;
    answer: AnswerState;
    onChange: (id: number, kondisi: 'Layak' | 'Tidak Layak') => void;
    onKeteranganChange: (id: number, keterangan: string) => void;
    attachments: File[];
    attachmentPreviews: string[];
    compressing: boolean;
    onAttachmentChange: (id: number, files: FileList | null) => void;
    onRemoveAttachment: (id: number, idx: number) => void;
}

export default function ChecklistItem({
    item,
    answer,
    onChange,
    onKeteranganChange,
    attachments,
    attachmentPreviews,
    compressing,
    onAttachmentChange,
    onRemoveAttachment,
}: Props) {
    const isTidakLayak = answer.kondisi === 'Tidak Layak';
    const isLayak = answer.kondisi === 'Layak';
    const unanswered = !answer.kondisi;

    return (
        <div
            className={cn(
                'rounded-xl border-2 p-3.5 transition-all duration-200',
                isLayak && 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/20',
                isTidakLayak && 'border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20',
                unanswered && item.kode_bahaya === 'AA' && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10',
                unanswered && item.kode_bahaya !== 'AA' && 'border-border bg-card',
            )}
        >
            {/* Item label + risk badge */}
            <div className="mb-3 flex flex-wrap items-start gap-2">
                <span className="mt-0.5 font-mono text-sm text-muted-foreground shrink-0">{item.urutan}.</span>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-base font-semibold leading-snug">{item.nama_item}</p>
                    <RiskBadge kode_bahaya={item.kode_bahaya} />
                </div>
            </div>

            {/* Layak / Tidak Layak — full width, large tap target */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onChange(item.id, 'Layak')}
                    className={cn(
                        'flex h-13 items-center justify-center gap-2 rounded-lg border-2 text-base font-semibold transition-all duration-150 active:scale-95',
                        isLayak
                            ? 'border-green-500 bg-green-500 text-white shadow-md'
                            : 'border-border bg-background text-muted-foreground hover:border-green-400 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30 dark:hover:text-green-400',
                    )}
                >
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    Layak
                </button>

                <button
                    type="button"
                    onClick={() => onChange(item.id, 'Tidak Layak')}
                    className={cn(
                        'flex h-13 items-center justify-center gap-2 rounded-lg border-2 text-base font-semibold transition-all duration-150 active:scale-95',
                        isTidakLayak
                            ? 'border-red-500 bg-red-500 text-white shadow-md'
                            : 'border-border bg-background text-muted-foreground hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400',
                    )}
                >
                    <XCircle className="h-4.5 w-4.5 shrink-0" />
                    Tidak Layak
                </button>
            </div>

            {/* Keterangan — wajib jika Tidak Layak, opsional jika Layak */}
            {(isTidakLayak || isLayak) && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                    <div>
                        {isTidakLayak ? (
                            <p className="mb-1.5 text-sm font-medium text-red-700 dark:text-red-400">
                                Wajib: Jelaskan kerusakan / kondisi yang ditemukan
                            </p>
                        ) : (
                            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                                Catatan (opsional)
                            </p>
                        )}
                        <Textarea
                            placeholder={isTidakLayak ? 'Contoh: Ban bocor, tekanan hanya 20 psi...' : 'Tambahkan catatan jika diperlukan…'}
                            value={answer.keterangan}
                            onChange={(e) => onKeteranganChange(item.id, e.target.value)}
                            className={cn(
                                'min-h-[72px] text-base',
                                isTidakLayak
                                    ? 'border-red-300 focus-visible:ring-red-400 dark:border-red-800'
                                    : 'min-h-[56px]',
                            )}
                            required={isTidakLayak}
                        />
                    </div>

                    {/* Attachment per item — hanya untuk Tidak Layak */}
                    {isTidakLayak && <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Lampiran Foto Bukti (opsional)</p>
                        <div className="flex items-center gap-2">
                            <label className={cn(
                                'flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs transition-colors',
                                compressing
                                    ? 'cursor-not-allowed border-muted-foreground/20 text-muted-foreground/40'
                                    : 'border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-600',
                            )}>
                                <Camera className="h-3.5 w-3.5" />
                                Foto
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    disabled={compressing}
                                    className="hidden"
                                    onChange={(e) => onAttachmentChange(item.id, e.target.files)}
                                />
                            </label>
                            <label className={cn(
                                'flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs transition-colors',
                                compressing
                                    ? 'cursor-not-allowed border-muted-foreground/20 text-muted-foreground/40'
                                    : 'border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-600',
                            )}>
                                <ImagePlus className="h-3.5 w-3.5" />
                                Galeri
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={compressing}
                                    className="hidden"
                                    onChange={(e) => onAttachmentChange(item.id, e.target.files)}
                                />
                            </label>
                            {compressing && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Memproses…
                                </span>
                            )}
                        </div>
                        {attachmentPreviews.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {attachmentPreviews.map((src, idx) => (
                                    <div key={idx} className="relative h-16 w-16 shrink-0">
                                        <img
                                            src={src}
                                            alt={`Bukti ${idx + 1}`}
                                            className="h-full w-full rounded-lg object-cover border"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveAttachment(item.id, idx)}
                                            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>}
                </div>
            )}
        </div>
    );
}
