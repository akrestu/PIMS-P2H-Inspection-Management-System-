import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { SegmentedChoice } from '@/components/pims/segmented';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';
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
                'rounded-xl border-(length:--bw) bg-card p-4 transition-colors duration-200',
                isTidakLayak && 'border-danger',
                isLayak && 'border-success/40',
            )}
        >
            {/* Nama item + kode bahaya */}
            <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-sm text-muted-foreground">
                    {item.urutan}.
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[17px] leading-snug font-medium">
                        {item.nama_item}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                        <RiskBadge kode_bahaya={item.kode_bahaya} />
                        {unanswered && (
                            <span className="text-xs text-muted-foreground">
                                Belum dijawab
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <SegmentedChoice
                label={item.nama_item}
                value={isLayak ? 'baik' : isTidakLayak ? 'rusak' : null}
                onChange={(v) =>
                    onChange(item.id, v === 'baik' ? 'Layak' : 'Tidak Layak')
                }
                labels={{ baik: 'Layak', rusak: 'Tidak Layak' }}
            />

            {/* Keterangan — wajib jika Tidak Layak, opsional jika Layak */}
            {(isTidakLayak || isLayak) && (
                <div className="mt-3 animate-in space-y-3 duration-200 fade-in slide-in-from-top-2">
                    <div>
                        {isTidakLayak ? (
                            <p className="mb-1.5 text-sm font-medium text-danger">
                                Wajib: Jelaskan kerusakan / kondisi yang
                                ditemukan
                            </p>
                        ) : (
                            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                                Catatan (opsional)
                            </p>
                        )}
                        <Textarea
                            placeholder={
                                isTidakLayak
                                    ? 'Contoh: Ban bocor, tekanan hanya 20 psi...'
                                    : 'Tambahkan catatan jika diperlukan…'
                            }
                            value={answer.keterangan}
                            onChange={(e) =>
                                onKeteranganChange(item.id, e.target.value)
                            }
                            className={cn(
                                'min-h-[72px] text-base',
                                !isTidakLayak && 'min-h-[56px]',
                            )}
                            required={isTidakLayak}
                        />
                    </div>

                    {/* Attachment per item — hanya untuk Tidak Layak */}
                    {isTidakLayak && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                Lampiran Foto Bukti (opsional)
                            </p>
                            <div className="flex items-center gap-2">
                                <label
                                    className={cn(
                                        'flex h-11 press cursor-pointer items-center gap-2 rounded-[10px] border-(length:--bw) border-dashed px-4 text-sm font-medium',
                                        compressing
                                            ? 'cursor-not-allowed border-muted-foreground/20 text-muted-foreground/40'
                                            : 'border-input text-foreground hover:bg-muted',
                                    )}
                                >
                                    <Camera className="size-4" />
                                    Foto
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        disabled={compressing}
                                        className="hidden"
                                        onChange={(e) =>
                                            onAttachmentChange(
                                                item.id,
                                                e.target.files,
                                            )
                                        }
                                    />
                                </label>
                                <label
                                    className={cn(
                                        'flex h-11 press cursor-pointer items-center gap-2 rounded-[10px] border-(length:--bw) border-dashed px-4 text-sm font-medium',
                                        compressing
                                            ? 'cursor-not-allowed border-muted-foreground/20 text-muted-foreground/40'
                                            : 'border-input text-foreground hover:bg-muted',
                                    )}
                                >
                                    <ImagePlus className="size-4" />
                                    Galeri
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        disabled={compressing}
                                        className="hidden"
                                        onChange={(e) =>
                                            onAttachmentChange(
                                                item.id,
                                                e.target.files,
                                            )
                                        }
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
                                        <div
                                            key={idx}
                                            className="relative size-[72px] shrink-0"
                                        >
                                            <img
                                                src={src}
                                                alt={`Bukti ${idx + 1}`}
                                                className="h-full w-full rounded-lg border object-cover"
                                            />
                                            <button
                                                aria-label="Hapus foto bukti"
                                                type="button"
                                                onClick={() =>
                                                    onRemoveAttachment(
                                                        item.id,
                                                        idx,
                                                    )
                                                }
                                                className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-ink text-ink-foreground shadow-md"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
