import { Progress } from '@/components/ui/progress';

interface Props {
    filled: number;
    total: number;
}

export default function ProgressBar({ filled, total }: Props) {
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Checklist terisi</span>
                <span className="font-medium">
                    {filled}/{total} ({percent}%)
                </span>
            </div>
            <Progress value={percent} className="h-2" />
        </div>
    );
}
