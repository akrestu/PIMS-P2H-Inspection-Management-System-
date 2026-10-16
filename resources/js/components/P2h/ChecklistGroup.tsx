import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { KritisTag } from '@/components/pims/status-pill';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    defaultOpen?: boolean;
}

const SECTION_LABEL: Record<P2hInspectionItem['section'], string> = {
    A: 'Pemeriksaan keliling unit / di luar kabin',
    B: 'Pemeriksaan dari dalam kabin',
    C: 'Kelengkapan tambahan',
};

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
    defaultOpen = false,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);

    const filledCount = items.filter(
        (item) =>
            answers[item.id]?.kondisi !== null &&
            answers[item.id]?.kondisi !== undefined,
    ).length;
    const allFilled = filledCount === items.length;
    const hasTL = items.some(
        (item) => answers[item.id]?.kondisi === 'Tidak Layak',
    );
    const hasAATL = items.some(
        (item) =>
            answers[item.id]?.kondisi === 'Tidak Layak' &&
            item.kode_bahaya === 'AA',
    );

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex min-h-14 w-full press items-center justify-between gap-3 rounded-xl border-(length:--bw) bg-muted-2 px-4 py-3 text-left hover:bg-muted',
                        hasAATL && 'border-danger',
                    )}
                >
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                            Seksi {section} · {items.length} item
                        </span>
                        <span className="block text-base font-semibold">
                            {SECTION_LABEL[section]}
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                        {hasAATL && <KritisTag withIcon />}
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                allFilled &&
                                    !hasTL &&
                                    'bg-success-soft text-success',
                                allFilled &&
                                    hasTL &&
                                    'bg-danger-soft text-danger',
                                !allFilled && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {filledCount}/{items.length}
                        </span>
                        <ChevronDown
                            className={cn(
                                'size-4 text-muted-foreground transition-transform duration-200',
                                open && 'rotate-180',
                            )}
                            aria-hidden
                        />
                    </span>
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                <div className="mt-2 space-y-2">
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
                            attachmentPreviews={
                                itemAttachmentPreviews[item.id] ?? []
                            }
                            compressing={compressingItems[item.id] ?? false}
                            onAttachmentChange={onItemAttachmentChange}
                            onRemoveAttachment={onRemoveItemAttachment}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
