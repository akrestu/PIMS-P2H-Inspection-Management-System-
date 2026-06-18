// ── Types ─────────────────────────────────────────────────────────────────────

interface PaSummary {
    fleet_compliance_pa: number | null;
    fleet_actual_pa: number | null;
    total_units: number;
    operation_count: number;
    bd_count: number;
    no_data_count: number;
    pa_threshold: number;
}

interface UnitPA {
    no_unit: string;
    jenis_unit: string;
    no_lambung: string | null;
    compliance_pa: number | null;
    actual_pa: number | null;
    current_status: 'operation' | 'bd' | 'no_data';
    working_hours: number;
    downtime_hours: number;
    operation_days: number;
    bd_days: number;
}

interface P2hSummary {
    fleet_compliance: number;
    perfect_units: number;
    total_missed: number;
    total_bd_days: number;
    total_units: number;
    total_days: number;
}

interface MatrixCell {
    session_id: number;
    slots_filled: number;
    total_tl: number;
    status: 'layak' | 'bd';
}

interface MatrixRow {
    no_unit: string;
    jenis_unit: string;
    no_lambung: string | null;
    cells: Record<string, MatrixCell | null>;
    filled_days: number;
    total_days: number;
    compliance_pct: number;
}

interface PaFilters {
    date_from: string;
    date_to: string;
    unit_id?: string;
    jenis_unit?: string;
}

interface P2hFilters {
    date_from: string;
    date_to: string;
    jenis_unit?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function fmtDateShort(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function todayId(): string {
    return new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function jenisLabel(jenis: string): string {
    if (jenis === 'Light Vehicle') return 'LV';
    return jenis;
}

function unitLabel(row: { no_unit: string; no_lambung: string | null }): string {
    return row.no_lambung ? `${row.no_unit} (Lambung: ${row.no_lambung})` : row.no_unit;
}

// ── PA Monitoring Formatter ───────────────────────────────────────────────────

export function formatPaReport(unitData: UnitPA[], summary: PaSummary, filters: PaFilters): string {
    const threshold = summary.pa_threshold;
    const lines: string[] = [];

    lines.push('*Laporan Ketersediaan Kendaraan*');
    lines.push(`${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    if (filters.jenis_unit) lines.push(jenisLabel(filters.jenis_unit));

    lines.push('');
    lines.push(`Beroperasi normal : ${summary.operation_count} unit`);
    lines.push(`Rusak (breakdown) : ${summary.bd_count} unit`);
    if (summary.no_data_count > 0) lines.push(`Belum ada data    : ${summary.no_data_count} unit`);
    lines.push(`Ketersediaan rata-rata : *${summary.fleet_actual_pa ?? '-'}%*`);
    lines.push(`Kepatuhan cek harian   : *${summary.fleet_compliance_pa ?? '-'}%*`);

    // --- BD units ---
    const bdUnits = unitData.filter((u) => u.current_status === 'bd');
    if (bdUnits.length > 0) {
        lines.push('');
        lines.push(`*Kendaraan Rusak (${bdUnits.length})*`);
        for (const u of bdUnits) {
            lines.push(`${unitLabel(u)} - ${jenisLabel(u.jenis_unit)}`);
            lines.push(`  Tersedia ${u.actual_pa ?? '-'}%, jam rusak ${u.downtime_hours > 0 ? u.downtime_hours.toFixed(0) + ' jam' : '-'}, rusak ${u.bd_days} hari`);
        }
    }

    // --- Operation below threshold ---
    const belowThreshold = unitData
        .filter((u) => u.current_status === 'operation' && u.actual_pa !== null && u.actual_pa < threshold)
        .sort((a, b) => (a.actual_pa ?? 0) - (b.actual_pa ?? 0));

    if (belowThreshold.length > 0) {
        lines.push('');
        lines.push(`*Perlu Perhatian - Di bawah ${threshold}% (${belowThreshold.length})*`);
        for (const u of belowThreshold) {
            lines.push(`${unitLabel(u)} - ${jenisLabel(u.jenis_unit)}`);
            lines.push(`  Tersedia ${u.actual_pa ?? '-'}%, cek harian ${u.compliance_pa ?? '-'}%, rusak ${u.bd_days} hari`);
        }
    }

    // --- Normal units ---
    const normalUnits = unitData
        .filter((u) => u.current_status === 'operation' && (u.actual_pa === null || u.actual_pa >= threshold))
        .sort((a, b) => (b.actual_pa ?? 0) - (a.actual_pa ?? 0));

    if (normalUnits.length > 0) {
        lines.push('');
        lines.push(`*Beroperasi Normal (${normalUnits.length})*`);
        for (const u of normalUnits) {
            lines.push(`- ${unitLabel(u)} (${jenisLabel(u.jenis_unit)}) - Tersedia ${u.actual_pa ?? '-'}%, cek ${u.compliance_pa ?? '-'}%`);
        }
    }

    // --- No data units ---
    const noDataUnits = unitData.filter((u) => u.current_status === 'no_data');
    if (noDataUnits.length > 0) {
        lines.push('');
        lines.push(`*Belum Ada Data (${noDataUnits.length})*`);
        for (const u of noDataUnits) {
            lines.push(`- ${unitLabel(u)} (${jenisLabel(u.jenis_unit)})`);
        }
    }

    lines.push('');
    lines.push(`_PIMS - ${todayId()}_`);

    return lines.join('\n');
}

// ── P2H Daily Reminder Formatter ─────────────────────────────────────────────

export function formatP2hReport(
    matrix: MatrixRow[],
    dates: string[],
    summary: P2hSummary,
    filters: P2hFilters,
): string {
    const lastDate = dates[dates.length - 1];
    const lines: string[] = [];

    lines.push('*Pengingat Pengecekan Kendaraan Harian*');
    lines.push(fmtDateShort(lastDate));
    if (filters.jenis_unit) lines.push(jenisLabel(filters.jenis_unit));

    const notFilled: MatrixRow[] = [];
    const filledLayak: MatrixRow[] = [];
    const filledBd: MatrixRow[] = [];

    for (const row of matrix) {
        const cell = row.cells[lastDate];
        if (!cell) notFilled.push(row);
        else if (cell.status === 'bd') filledBd.push(row);
        else filledLayak.push(row);
    }

    lines.push('');
    if (notFilled.length === 0) {
        lines.push('*Semua kendaraan sudah dicek hari ini.*');
    } else {
        lines.push(`*Belum dicek (${notFilled.length} kendaraan)*`);
        for (const row of notFilled) {
            lines.push(`- ${unitLabel(row)} (${jenisLabel(row.jenis_unit)})`);
        }
    }

    lines.push('');
    if (filledLayak.length === 0 && filledBd.length === 0) {
        lines.push('Belum ada kendaraan yang dicek hari ini.');
    } else {
        if (filledLayak.length > 0) {
            lines.push(`*Sudah dicek - Layak (${filledLayak.length} kendaraan)*`);
            if (filledLayak.length <= 10) {
                for (const row of filledLayak) {
                    lines.push(`- ${unitLabel(row)} (${jenisLabel(row.jenis_unit)})`);
                }
            } else {
                lines.push(`- ${filledLayak.length} kendaraan dinyatakan layak`);
            }
        }
        if (filledBd.length > 0) {
            lines.push('');
            lines.push(`*Sudah dicek - Rusak (${filledBd.length} kendaraan)*`);
            for (const row of filledBd) {
                lines.push(`- ${unitLabel(row)} (${jenisLabel(row.jenis_unit)})`);
            }
        }
    }

    lines.push('');
    lines.push(`Periode ${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    lines.push(`Kepatuhan pengisian : *${summary.fleet_compliance}%*`);
    lines.push(`Hari terlewat       : ${summary.total_missed} hari`);
    if (summary.total_bd_days > 0) lines.push(`Hari rusak          : ${summary.total_bd_days} hari`);

    lines.push('');
    lines.push(`_PIMS - ${todayId()}_`);

    return lines.join('\n');
}

// ── P2H Historical Report Formatter ──────────────────────────────────────────

export function formatP2hHistoryReport(
    matrix: MatrixRow[],
    summary: P2hSummary,
    filters: P2hFilters,
): string {
    const lines: string[] = [];

    lines.push('*Laporan Pengecekan Kendaraan*');
    lines.push(`${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    if (filters.jenis_unit) lines.push(jenisLabel(filters.jenis_unit));

    lines.push('');
    lines.push(`Kepatuhan armada         : *${summary.fleet_compliance}%*`);
    lines.push(`Kendaraan sempurna (100%): ${summary.perfect_units} unit`);
    lines.push(`Hari terlewat            : ${summary.total_missed} hari`);
    if (summary.total_bd_days > 0) lines.push(`Hari rusak               : ${summary.total_bd_days} hari`);

    const sorted = [...matrix].sort((a, b) => a.compliance_pct - b.compliance_pct);
    const poor = sorted.filter((r) => r.compliance_pct < 70);
    const fair = sorted.filter((r) => r.compliance_pct >= 70 && r.compliance_pct < 90);
    const good = sorted.filter((r) => r.compliance_pct >= 90);

    if (poor.length > 0) {
        lines.push('');
        lines.push(`*Perlu Perhatian - di bawah 70% (${poor.length} kendaraan)*`);
        for (const r of poor) {
            const missed = r.total_days - r.filled_days;
            lines.push(`- ${unitLabel(r)} (${jenisLabel(r.jenis_unit)})`);
            lines.push(`  Dicek ${r.filled_days} dari ${r.total_days} hari, tidak dicek ${missed} hari`);
        }
    }

    if (fair.length > 0) {
        lines.push('');
        lines.push(`*Cukup Baik - 70% sampai 89% (${fair.length} kendaraan)*`);
        for (const r of fair) {
            const missed = r.total_days - r.filled_days;
            lines.push(`- ${unitLabel(r)} (${jenisLabel(r.jenis_unit)}) - dicek ${r.filled_days}/${r.total_days} hari, terlewat ${missed} hari`);
        }
    }

    if (good.length > 0) {
        lines.push('');
        lines.push(`*Baik - 90% ke atas (${good.length} kendaraan)*`);
        for (const r of good) {
            const detail = r.compliance_pct === 100
                ? `sempurna, dicek setiap hari`
                : `dicek ${r.filled_days} dari ${r.total_days} hari`;
            lines.push(`- ${unitLabel(r)} (${jenisLabel(r.jenis_unit)}) - ${detail}`);
        }
    }

    lines.push('');
    lines.push(`_PIMS - ${todayId()}_`);

    return lines.join('\n');
}
