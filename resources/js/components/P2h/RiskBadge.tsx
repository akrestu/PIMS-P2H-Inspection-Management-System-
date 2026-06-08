import { Badge } from '@/components/ui/badge';
import type { P2hInspectionItem } from '@/types/pims';

interface Props {
    kode_bahaya: P2hInspectionItem['kode_bahaya'];
}

const config = {
    AA: { label: 'AA — Stop', className: 'bg-red-600 hover:bg-red-600 text-white' },
    A:  { label: 'A', className: 'bg-yellow-500 hover:bg-yellow-500 text-black' },
};

export default function RiskBadge({ kode_bahaya }: Props) {
    const c = config[kode_bahaya];
    return (
        <Badge variant="default" className={c.className + ' text-xs'}>
            {c.label}
        </Badge>
    );
}
