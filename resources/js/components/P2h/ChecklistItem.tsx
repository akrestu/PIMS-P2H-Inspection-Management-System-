import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';
import { CheckCircle2, XCircle } from 'lucide-react';
import RiskBadge from './RiskBadge';

interface Props {
    item: P2hInspectionItem;
    answer: AnswerState;
    onChange: (id: number, kondisi: 'Layak' | 'Tidak Layak') => void;
    onKeteranganChange: (id: number, keterangan: string) => void;
}

export default function ChecklistItem({ item, answer, onChange, onKeteranganChange }: Props) {
    const isTidakLayak = answer.kondisi === 'Tidak Layak';
    const isLayak = answer.kondisi === 'Layak';
    const unanswered = !answer.kondisi;

    return (
        <div
            className={cn(
                'rounded-xl border-2 p-3.5 transition-all duration-200',
                isLayak && 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/20',
                isTidakLayak && 'border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20',
                unanswered && item.risiko === 'Critical' && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10',
                unanswered && item.risiko !== 'Critical' && 'border-border bg-card',
            )}
        >
            {/* Item label + risk badge */}
            <div className="mb-3 flex flex-wrap items-start gap-2">
                <span className="mt-0.5 font-mono text-xs text-muted-foreground shrink-0">{item.urutan}.</span>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold leading-snug">{item.nama_item}</p>
                    <RiskBadge risiko={item.risiko} />
                </div>
            </div>

            {/* Layak / Tidak Layak — full width, large tap target */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onChange(item.id, 'Layak')}
                    className={cn(
                        'flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-all duration-150 active:scale-95',
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
                        'flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-all duration-150 active:scale-95',
                        isTidakLayak
                            ? 'border-red-500 bg-red-500 text-white shadow-md'
                            : 'border-border bg-background text-muted-foreground hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400',
                    )}
                >
                    <XCircle className="h-4.5 w-4.5 shrink-0" />
                    Tidak Layak
                </button>
            </div>

            {/* Keterangan (muncul jika Tidak Layak) */}
            {isTidakLayak && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="mb-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                        Wajib: Jelaskan kerusakan / kondisi yang ditemukan
                    </p>
                    <Textarea
                        placeholder="Contoh: Ban bocor, tekanan hanya 20 psi..."
                        value={answer.keterangan}
                        onChange={(e) => onKeteranganChange(item.id, e.target.value)}
                        className="min-h-[72px] border-red-300 text-sm focus-visible:ring-red-400 dark:border-red-800"
                        required
                    />
                </div>
            )}
        </div>
    );
}
