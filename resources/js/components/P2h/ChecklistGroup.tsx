import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';
import ChecklistItem from './ChecklistItem';

interface Props {
    section: P2hInspectionItem['section'];
    items: P2hInspectionItem[];
    answers: Record<number, AnswerState>;
    onChange: (id: number, kondisi: 'Layak' | 'Tidak Layak') => void;
    onKeteranganChange: (id: number, keterangan: string) => void;
    itemAttachments: Record<number, File[]>;
    itemAttachmentPreviews: Record<number, string[]>;
    compressingItems: Record<number, boolean>;
    onItemAttachmentChange: (id: number, files: FileList | null) => void;
    onRemoveItemAttachment: (id: number, idx: number) => void;
    /** Item yang gagal validasi "Lanjut" + pesannya. */
    invalid?: { id: number; message: string } | null;
}

const SECTION_LABEL: Record<P2hInspectionItem['section'], string> = {
    A: 'Keliling unit / luar kabin',
    B: 'Dari dalam kabin',
    C: 'Kelengkapan tambahan',
};

/**
 * Satu kategori checklist (FormP2H.dc.html): judul 20px + hitungan "n/total"
 * (hijau bila lengkap & semua layak, merah bila ada Tidak Layak), lalu baris item
 * dipisah garis — tanpa kartu/akordeon agar semua item terlihat saat menggulir.
 */
export default function ChecklistGroup({
    section,
    items,
    answers,
    onChange,
    onKeteranganChange,
    itemAttachments,
    itemAttachmentPreviews,
    compressingItems,
    onItemAttachmentChange,
    onRemoveItemAttachment,
    invalid,
}: Props) {
    const filledCount = items.filter((item) => !!answers[item.id]?.kondisi).length;
    const allFilled = filledCount === items.length;
    const hasTL = items.some(
        (item) => answers[item.id]?.kondisi === 'Tidak Layak',
    );

    return (
        <section aria-labelledby={`seksi-${section}`} className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3 px-0.5 pb-2">
                <h2
                    id={`seksi-${section}`}
                    className="text-xl font-semibold tracking-[-0.015em]"
                >
                    {SECTION_LABEL[section]}
                </h2>
                <span
                    className={cn(
                        'shrink-0 text-sm font-semibold tnum',
                        hasTL
                            ? 'text-danger'
                            : allFilled
                              ? 'text-success'
                              : 'text-muted-foreground',
                    )}
                >
                    {filledCount}/{items.length}
                </span>
            </div>
            {items.map((item) => (
                <ChecklistItem
                    key={item.id}
                    item={item}
                    answer={
                        answers[item.id] ?? {
                            inspection_item_id: item.id,
                            kondisi: null,
                            keterangan: '',
                        }
                    }
                    onChange={onChange}
                    onKeteranganChange={onKeteranganChange}
                    attachments={itemAttachments[item.id] ?? []}
                    attachmentPreviews={itemAttachmentPreviews[item.id] ?? []}
                    compressing={compressingItems[item.id] ?? false}
                    onAttachmentChange={onItemAttachmentChange}
                    onRemoveAttachment={onRemoveItemAttachment}
                    error={invalid?.id === item.id ? invalid.message : null}
                />
            ))}
        </section>
    );
}
