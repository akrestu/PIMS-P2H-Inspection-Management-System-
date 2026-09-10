import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SiteOption {
    id: number;
    name: string;
}

interface SiteSelectProps {
    sites: SiteOption[];
    value: number | null;
    onChange: (id: number | null) => void;
    error?: string;
}

export function SiteSelect({ sites, value, onChange, error }: SiteSelectProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                Site
                <span className="ml-1 font-normal text-muted-foreground">
                    (opsional)
                </span>
            </Label>
            <Select
                value={value ? String(value) : '__none__'}
                onValueChange={(v) =>
                    onChange(v === '__none__' ? null : Number(v))
                }
            >
                <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Pilih site..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">— Tidak ada —</SelectItem>
                    {sites.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
