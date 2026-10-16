/**
 * Format angka & waktu PIMS (docs/08-business-rules.md#11, docs/10-copy.md).
 * Semua memakai locale `id-ID`: `12.480,5` · `87,5%` · `16 Okt 2026` · `06:00`.
 */

const LOCALE = 'id-ID';

export const TZ_LABEL: Record<string, string> = {
    'Asia/Jakarta': 'WIB',
    'Asia/Makassar': 'WITA',
    'Asia/Jayapura': 'WIT',
};

type DateInput = Date | string | number;

const toDate = (value: DateInput): Date =>
    value instanceof Date ? value : new Date(value);

const isValid = (d: Date): boolean => !Number.isNaN(d.getTime());

/** Angka umum: `12480.5` → `12.480,5`. */
export function formatNumber(
    value: number | null | undefined,
    maximumFractionDigits = 1,
): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }

    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(
        value,
    );
}

/** Hour meter / KM — selalu 1 desimal: `12481` → `12.481,0`. */
export function formatHM(value: number | string | null | undefined): string {
    const n = typeof value === 'string' ? Number(value) : value;

    if (n === null || n === undefined || Number.isNaN(n)) {
        return '—';
    }

    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(n);
}

/** Persen dari nilai 0–100: 1 desimal bila < 100 → `87,5%`, `100%`. */
export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }

    const digits = value >= 100 ? 0 : 1;

    return `${new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)}%`;
}

/** Tanggal `16 Okt 2026`; `withDay` → `Jum, 16 Okt 2026`. */
export function formatDate(
    value: DateInput,
    options: { withDay?: boolean; withYear?: boolean; timeZone?: string } = {},
): string {
    const d = toDate(value);

    if (!isValid(d)) {
        return '—';
    }

    const { withDay = false, withYear = true, timeZone } = options;
    const parts = new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: withYear ? 'numeric' : undefined,
        weekday: withDay ? 'short' : undefined,
        timeZone,
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? '';
    // id-ID memberi "Agu"/"Okt" dengan/tanpa titik tergantung engine — normalisasi
    const month = get('month').replace('.', '');
    const date = [get('day'), month, withYear ? get('year') : '']
        .filter(Boolean)
        .join(' ');

    return withDay ? `${get('weekday').replace('.', '')}, ${date}` : date;
}

/** Jam 24-jam `06:00`; `showZone` menambah label zona (WIB/WITA/WIT) untuk data lintas site. */
export function formatTime(
    value: DateInput,
    timeZone?: string,
    showZone = false,
): string {
    const d = toDate(value);

    if (!isValid(d)) {
        return '—';
    }

    const time = new Intl.DateTimeFormat(LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone,
    })
        .format(d)
        .replace('.', ':');

    return showZone && timeZone && TZ_LABEL[timeZone]
        ? `${time} ${TZ_LABEL[timeZone]}`
        : time;
}

/** `16 Okt 2026 · 06:00` */
export function formatDateTime(value: DateInput, timeZone?: string): string {
    return `${formatDate(value, { timeZone })} · ${formatTime(value, timeZone)}`;
}

/** Durasi dari menit: `608` → `10 j 08 m`, `45` → `45 m`, `1500` → `1 h 01 j`. */
export function formatDuration(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
        return '—';
    }

    const total = Math.max(0, Math.round(minutes));
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (days > 0) {
        return `${days} h ${pad(hours)} j`;
    }

    if (hours > 0) {
        return `${hours} j ${pad(mins)} m`;
    }

    return `${mins} m`;
}
