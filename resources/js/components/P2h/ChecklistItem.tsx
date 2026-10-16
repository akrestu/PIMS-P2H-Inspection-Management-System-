import { AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import { PhotoPicker } from '@/components/pims/photo-picker';
import { SegmentedChoice } from '@/components/pims/segmented';
import { KritisTag } from '@/components/pims/status-pill';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';

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
    /** Ditandai saat "Lanjut" ditekan dengan item ini kosong / tanpa keterangan. */
    error?: string | null;
}

/** DOM id baris item — dipakai form untuk scroll ke item yang belum valid. */
export const checklistItemDomId = (id: number) => `p2h-item-${id}`;

/**
 * Baris checklist (FormP2H.dc.html langkah Checklist): nama (body-lg) + caption
 * kode bahaya + tag KRITIS, SegmentedChoice Layak/Tidak Layak. Tidak Layak →
 * expand catatan wajib + foto; item kritis memunculkan peringatan BD otomatis.
 */
export default function ChecklistItem({
    item,
    answer,
    onChange,
    onKeteranganChange,
    attachmentPreviews,
    compressing,
    onAttachmentChange,
    onRemoveAttachment,
    error,
}: Props) {
    const isTidakLayak = answer.kondisi === 'Tidak Layak';
    const isLayak = answer.kondisi === 'Layak';
    const kritis = item.kode_bahaya === 'AA';
    // Catatan opsional untuk item Layak disembunyikan sampai diminta
    const [showNote, setShowNote] = useState(answer.keterangan.trim() !== '');
    const noteId = `${checklistItemDomId(item.id)}-catatan`;

    return (
        <div
            id={checklistItemDomId(item.id)}
            className="flex scroll-mt-56 flex-col gap-2.5 border-t-(length:--bw) pt-3.5 pb-[18px]"
        >
            <div className="flex items-start gap-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[17px] leading-6 font-medium">
                        {item.nama_item}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {kritis
                            ? 'Kode AA · unit Stop bila Tidak Layak'
                            : 'Kode A'}
                    </span>
                </span>
                {kritis && (
                    <KritisTag
                        withIcon
                        className="h-6 px-2"
                        title="Kode bahaya AA — unit Stop bila Tidak Layak"
                    />
                )}
            </div>

            <SegmentedChoice
                label={item.nama_item}
                value={isLayak ? 'baik' : isTidakLayak ? 'rusak' : null}
                onChange={(v) =>
                    onChange(item.id, v === 'baik' ? 'Layak' : 'Tidak Layak')
                }
                labels={{ baik: 'Layak', rusak: 'Tidak Layak' }}
            />

            {error && (
                <p role="alert" className="text-sm font-medium text-danger">
                    {error}
                </p>
            )}

            {isTidakLayak && (
                <div className="flex animate-in flex-col gap-2.5 duration-200 fade-in slide-in-from-top-1">
                    {kritis && (
                        <p className="flex items-start gap-2 rounded-[10px] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
                            <AlertTriangle
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden
                            />
                            Item kritis rusak: rekomendasi hasil P2H menjadi
                            BD (Tidak Layak).
                        </p>
                    )}
                    <label htmlFor={noteId} className="text-sm font-medium">
                        Catatan kerusakan{' '}
                        <span className="text-danger">*</span>
                    </label>
                    <Textarea
                        id={noteId}
                        rows={2}
                        placeholder="Contoh: rembesan di sambungan selang sisi kiri"
                        value={answer.keterangan}
                        onChange={(e) =>
                            onKeteranganChange(item.id, e.target.value)
                        }
                        aria-invalid={!!error && !answer.keterangan.trim()}
                        className="min-h-[72px] text-base"
                        required
                    />
                    <PhotoPicker
                        compact
                        previews={attachmentPreviews}
                        processing={compressing}
                        onFiles={(files) => onAttachmentChange(item.id, files)}
                        onRemove={(idx) => onRemoveAttachment(item.id, idx)}
                    />
                </div>
            )}

            {isLayak &&
                (showNote ? (
                    <Textarea
                        aria-label={`Catatan ${item.nama_item} (opsional)`}
                        placeholder="Catatan (opsional)"
                        value={answer.keterangan}
                        onChange={(e) =>
                            onKeteranganChange(item.id, e.target.value)
                        }
                        className="min-h-[56px] animate-in text-base duration-200 fade-in"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowNote(true)}
                        className={cn(
                            'inline-flex h-8 items-center gap-1 self-start rounded-md px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Plus className="size-3.5" aria-hidden />
                        Tambah catatan
                    </button>
                ))}
        </div>
    );
}
