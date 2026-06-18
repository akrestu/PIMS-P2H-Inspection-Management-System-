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
        month: 'short',
        year: 'numeric',
    });
}

function fmtDateShort(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

function todayId(): string {
    return new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function shortJenis(jenis: string): string {
    return jenis === 'Light Vehicle' ? 'LV' : jenis;
}

// ── PA Monitoring Formatter ───────────────────────────────────────────────────

export function formatPaReport(unitData: UnitPA[], summary: PaSummary, filters: PaFilters): string {
    const threshold = summary.pa_threshold;
    const lines: string[] = [];

    lines.push('*LAPORAN MONITORING PA*');
    lines.push(`Periode  : ${fmtDate(filters.date_from)} - ${fmtDate(filters.date_to)}`);
    if (filters.jenis_unit) {
        lines.push(`Kategori : ${filters.jenis_unit}`);
    }
    lines.push('');
    lines.push('*RINGKASAN FLEET*');
    lines.push(
        `- PA Aktual Fleet   : ${summary.fleet_actual_pa !== null ? `${summary.fleet_actual_pa}%` : 'N/A'}`,
    );
    lines.push(
        `- Kelayakan P2H     : ${summary.fleet_compliance_pa !== null ? `${summary.fleet_compliance_pa}%` : 'N/A'}`,
    );
    lines.push(`- Operation : ${summary.operation_count} unit`);
    lines.push(`- Breakdown : ${summary.bd_count} unit`);
    if (summary.no_data_count > 0) {
        lines.push(`- No Data   : ${summary.no_data_count} unit`);
    }

    const needsAttention = unitData.filter(
        (u) => u.actual_pa === null || u.actual_pa < threshold || u.current_status === 'bd',
    );
    const normalUnits = unitData.filter(
        (u) => u.actual_pa !== null && u.actual_pa >= threshold && u.current_status !== 'bd',
    );

    if (needsAttention.length > 0) {
        lines.push('');
        lines.push(`*[!] PERLU PERHATIAN (PA < ${threshold}% atau BD)*`);
        for (const u of needsAttention) {
            const pa = u.actual_pa !== null ? `${u.actual_pa}%` : 'N/A';
            const p2h = u.compliance_pa !== null ? `${u.compliance_pa}%` : 'N/A';
            const st =
                u.current_status === 'bd'
                    ? 'Breakdown'
                    : u.current_status === 'operation'
                      ? 'Operation'
                      : 'No Data';
            lines.push(`[X] ${u.no_unit} (${shortJenis(u.jenis_unit)}) - PA: ${pa} | P2H: ${p2h} | ${st}`);
        }
    }

    if (normalUnits.length > 0) {
        lines.push('');
        if (normalUnits.length <= 5) {
            lines.push('*[OK] UNIT OPERASI NORMAL*');
            for (const u of normalUnits) {
                lines.push(
                    `[v] ${u.no_unit} (${shortJenis(u.jenis_unit)}) - PA: ${u.actual_pa}% | P2H: ${u.compliance_pa ?? 'N/A'}%`,
                );
            }
        } else {
            lines.push(`[v] ${normalUnits.length} unit beroperasi normal (PA >= ${threshold}%)`);
        }
    }

    lines.push('');
    lines.push(`_Dikirim dari PIMS - ${todayId()}_`);

    return lines.join('\n');
}

// ── P2H Compliance Formatter ──────────────────────────────────────────────────

export function formatP2hReport(
    matrix: MatrixRow[],
    dates: string[],
    summary: P2hSummary,
    filters: P2hFilters,
): string {
    const lastDate = dates[dates.length - 1];
    const lines: string[] = [];

    const jenisLabel = filters.jenis_unit ?? null;

    lines.push(`*REMINDER P2H - ${fmtDate(lastDate)}*`);
    lines.push(`Periode  : ${fmtDate(filters.date_from)} - ${fmtDate(filters.date_to)}`);
    lines.push(`Kategori : ${jenisLabel ?? 'Semua Unit'}`);

    const notFilled: MatrixRow[] = [];
    const filledLayak: MatrixRow[] = [];
    const filledBd: MatrixRow[] = [];

    for (const row of matrix) {
        const cell = row.cells[lastDate];
        if (cell === null || cell === undefined) {
            notFilled.push(row);
        } else if (cell.status === 'bd') {
            filledBd.push(row);
        } else {
            filledLayak.push(row);
        }
    }

    lines.push('');
    lines.push(`--- BELUM P2H (${fmtDateShort(lastDate)}) ---`);
    if (notFilled.length === 0) {
        lines.push('[v] Semua unit sudah mengisi P2H');
    } else {
        for (const row of notFilled) {
            const lambung = row.no_lambung ? ` - No. Lambung: ${row.no_lambung}` : '';
            lines.push(`[X] ${row.no_unit} (${shortJenis(row.jenis_unit)})${lambung}`);
        }
    }

    lines.push('');
    lines.push(`--- SUDAH P2H (${fmtDateShort(lastDate)}) ---`);
    if (filledLayak.length === 0 && filledBd.length === 0) {
        lines.push('Belum ada unit yang mengisi P2H');
    } else {
        // Collapse layak units if too many to keep message short
        if (filledLayak.length <= 10) {
            for (const row of filledLayak) {
                lines.push(`[v] ${row.no_unit} (${shortJenis(row.jenis_unit)}) - Layak`);
            }
        } else {
            lines.push(`[v] ${filledLayak.length} unit sudah P2H - Layak`);
        }
        for (const row of filledBd) {
            lines.push(`[!] ${row.no_unit} (${shortJenis(row.jenis_unit)}) - BD`);
        }
    }

    lines.push('');
    lines.push('--- RINGKASAN PERIODE ---');
    lines.push(`- Fleet Compliance  : ${summary.fleet_compliance}%`);
    lines.push(`- Total Hari Terlewat: ${summary.total_missed} hari`);
    if (filledBd.length > 0) {
        lines.push(`- Unit BD hari ini  : ${filledBd.length} unit`);
    }

    lines.push('');
    lines.push(`_Dikirim dari PIMS - ${todayId()}_`);

    return lines.join('\n');
}
