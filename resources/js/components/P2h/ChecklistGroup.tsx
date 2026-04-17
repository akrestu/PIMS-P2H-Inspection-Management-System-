import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ChecklistItem from './ChecklistItem';

interface Props {
    risiko: P2hInspectionItem['risiko'];
    items: P2hInspectionItem[];
    answers: Record<number, AnswerState>;
    onChange: (id: number, kondisi: 'Layak' | 'Tidak Layak') => void;
    onKeteranganChange: (id: number, keterangan: string) => void;
    defaultOpen?: boolean;
}

const riskGroupConfig = {
    Critical: {
        label: 'Critical',
        headerClass: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
        badgeClass: 'bg-red-600 text-white hover:bg-red-600',
        dotClass: 'bg-red-500',
    },
    Tinggi: {
        label: 'Tinggi',
        headerClass: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900',
        badgeClass: 'bg-orange-500 text-white hover:bg-orange-500',
        dotClass: 'bg-orange-500',
    },
    Sedang: {
        label: 'Sedang',
        headerClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900',
        badgeClass: 'bg-yellow-500 text-black hover:bg-yellow-500',
        dotClass: 'bg-yellow-500',
    },
    Rendah: {
        label: 'Rendah',
        headerClass: 'bg-muted/30 border-border',
        badgeClass: '',
        dotClass: 'bg-muted-foreground',
    },
};

export default function ChecklistGroup({
    risiko,
    items,
    answers,
    onChange,
    onKeteranganChange,
    defaultOpen = false,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const config = riskGroupConfig[risiko];

    const filledCount = items.filter((item) => answers[item.id]?.kondisi !== null && answers[item.id]?.kondisi !== undefined).length;
    const allFilled = filledCount === items.length;
    const hasTL = items.some((item) => answers[item.id]?.kondisi === 'Tidak Layak');

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                        config.headerClass,
                        'hover:brightness-95 active:brightness-90',
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', config.dotClass)} />
                        <span className="text-sm font-semibold">Risiko {config.label}</span>
                        <Badge className={cn('text-xs px-2 py-0', config.badgeClass)}>
                            {items.length} item
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Completion pill */}
                        <span
                            className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                allFilled && !hasTL && 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                                allFilled && hasTL && 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                                !allFilled && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {filledCount}/{items.length}
                        </span>
                        <ChevronDown
                            className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                open && 'rotate-180',
                            )}
                        />
                    </div>
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                <div className="mt-2 space-y-2">
                    {items.map((item) => (
                        <ChecklistItem
                            key={item.id}
                            item={item}
                            answer={answers[item.id] ?? { inspection_item_id: item.id, kondisi: null, keterangan: '' }}
                            onChange={onChange}
                            onKeteranganChange={onKeteranganChange}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
