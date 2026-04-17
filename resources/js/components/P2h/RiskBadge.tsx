import { Badge } from '@/components/ui/badge';
import type { P2hInspectionItem } from '@/types/pims';

interface Props {
    risiko: P2hInspectionItem['risiko'];
}

const riskConfig = {
    Critical: { variant: 'destructive' as const, label: 'Critical' },
    Tinggi:   { variant: 'default' as const,     label: 'Tinggi',   className: 'bg-orange-500 hover:bg-orange-600' },
    Sedang:   { variant: 'default' as const,     label: 'Sedang',   className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    Rendah:   { variant: 'secondary' as const,   label: 'Rendah' },
};

export default function RiskBadge({ risiko }: Props) {
    const config = riskConfig[risiko];
    return (
        <Badge variant={config.variant} className={('className' in config ? config.className : '') + ' text-xs'}>
            {config.label}
        </Badge>
    );
}
