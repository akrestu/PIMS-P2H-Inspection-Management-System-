import { PhotoPicker } from '@/components/pims/photo-picker';
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
                            <PhotoPicker
                                compact
                                previews={attachmentPreviews}
                                processing={compressing}
                                onFiles={(files) =>
                                    onAttachmentChange(item.id, files)
                                }
                                onRemove={(idx) =>
                                    onRemoveAttachment(item.id, idx)
                                }
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
