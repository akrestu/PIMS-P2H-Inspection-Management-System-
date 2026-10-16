import { KritisTag } from '@/components/pims/status-pill';
import type { P2hInspectionItem } from '@/types/pims';

interface Props {
    kode_bahaya: P2hInspectionItem['kode_bahaya'];
}

/** Kode bahaya item: AA = kritis (Stop), A = umum. */
export default function RiskBadge({ kode_bahaya }: Props) {
    if (kode_bahaya === 'AA') {
        return (
            <KritisTag
                withIcon
                title="Kode bahaya AA — unit Stop bila Tidak Layak"
            />
        );
    }

    return (
        <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
            Kode A
        </span>
    );
}
