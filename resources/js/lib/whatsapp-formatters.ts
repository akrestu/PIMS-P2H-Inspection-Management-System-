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
    department: string | null;
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
    session_id?: number;
    slots_filled?: number;
    total_tl?: number;
    downtime_tipe?: string;
    status: 'layak' | 'bd' | 'downtime';
}

interface MatrixRow {
    no_unit: string;
    jenis_unit: string;
    no_lambung: string | null;
    department: string | null;
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

/** Short label: "WLV 010" or "WLV 010 · B 9729 PBD" */
function unitLabel(row: { no_unit: string; no_lambung: string | null }): string {
    return row.no_lambung ? `${row.no_unit} · ${row.no_lambung}` : row.no_unit;
}

function deptSuffix(row: { jenis_unit: string; department: string | null }): string {
    return row.jenis_unit === 'Light Vehicle' && row.department ? ` (${row.department})` : '';
}

/** Group LV rows by department, returns sorted Map<deptName, rows[]>. */
function groupLvByDept<T extends { jenis_unit: string; department: string | null }>(
    items: T[],
): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const key = item.department ?? '—';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/** Push items one-per-line, collapsing beyond `max`. */
function pushCollapsed(lines: string[], items: string[], max = 5): void {
    for (let i = 0; i < Math.min(items.length, max); i++) lines.push(items[i]);
    if (items.length > max) lines.push(`  _...dan ${items.length - max} unit lainnya_`);
}

/** Join items into comma-separated lines of ~60 chars, collapse beyond `maxLines`. */
function pushJoined(lines: string[], names: string[], max = 2): void {
    const chunks: string[] = [];
    let current = '';
    for (const name of names) {
        const next = current ? `${current}, ${name}` : name;
        if (next.length > 60 && current) {
            chunks.push(current);
            current = name;
        } else {
            current = next;
        }
    }
    if (current) chunks.push(current);

    const shown = chunks.slice(0, max);
    for (const chunk of shown) lines.push(chunk);

    const shownNames = shown.join(', ').split(', ').length;
    const remaining = names.length - shownNames;
    if (remaining > 0) lines.push(`_...dan ${remaining} unit lainnya_`);
}

// ── PA Monitoring Formatter ───────────────────────────────────────────────────

export function formatPaReport(unitData: UnitPA[], summary: PaSummary, filters: PaFilters): string {
    const threshold = summary.pa_threshold;
    const lines: string[] = [];

    lines.push('*Laporan Ketersediaan Armada*');
    const rangeStr = `${fmtDate(filters.date_from)} – ${fmtDate(filters.date_to)}`;
    lines.push(filters.jenis_unit ? `${rangeStr} · ${jenisLabel(filters.jenis_unit)}` : rangeStr);

    lines.push('');
    lines.push(`Beroperasi    : *${summary.operation_count} unit*`);
    lines.push(`Rusak (BD)    : *${summary.bd_count} unit*`);
    if (summary.no_data_count > 0) lines.push(`Belum ada data: ${summary.no_data_count} unit`);
    lines.push(`PA rata-rata  : *${summary.fleet_actual_pa ?? '-'}%*`);
    lines.push(`Kepatuhan P2H : *${summary.fleet_compliance_pa ?? '-'}%*`);

    // --- BD units ---
    const bdUnits = unitData.filter((u) => u.current_status === 'bd');
    if (bdUnits.length > 0) {
        lines.push('');
        lines.push(`*Kendaraan Rusak — ${bdUnits.length} unit*`);
        for (const u of bdUnits) {
            lines.push(`${unitLabel(u)}${deptSuffix(u)}`);
            const parts = [`PA ${u.actual_pa ?? '-'}%`];
            if (u.downtime_hours > 0) parts.push(`downtime ${u.downtime_hours.toFixed(0)} jam`);
            if (u.bd_days > 0) parts.push(`rusak ${u.bd_days} hari`);
            lines.push(`  ${parts.join(' · ')}`);
        }
    }

    // --- Operation below threshold ---
    const belowThreshold = unitData
        .filter((u) => u.current_status === 'operation' && u.actual_pa !== null && u.actual_pa < threshold)
        .sort((a, b) => (a.actual_pa ?? 0) - (b.actual_pa ?? 0));

    if (belowThreshold.length > 0) {
        lines.push('');
        lines.push(`*Perlu Perhatian — PA di bawah ${threshold}% (${belowThreshold.length} unit)*`);
        const items = belowThreshold.map((u) => {
            const parts = [`PA ${u.actual_pa ?? '-'}%`, `P2H ${u.compliance_pa ?? '-'}%`];
            if (u.bd_days > 0) parts.push(`rusak ${u.bd_days} hari`);
            return `${unitLabel(u)}${deptSuffix(u)}\n  ${parts.join(' · ')}`;
        });
        pushCollapsed(lines, items, 10);
    }

    // --- Normal units ---
    const normalUnits = unitData
        .filter((u) => u.current_status === 'operation' && (u.actual_pa === null || u.actual_pa >= threshold))
        .sort((a, b) => (b.actual_pa ?? 0) - (a.actual_pa ?? 0));

    if (normalUnits.length > 0) {
        lines.push('');
        lines.push(`*Beroperasi Normal — ${normalUnits.length} unit*`);
        const items = normalUnits.map((u) => {
            const parts: string[] = [];
            if (u.actual_pa !== null) parts.push(`PA ${u.actual_pa}%`);
            if (u.compliance_pa !== null) parts.push(`P2H ${u.compliance_pa}%`);
            return `${unitLabel(u)}${deptSuffix(u)}${parts.length ? `\n  ${parts.join(' · ')}` : ''}`;
        });
        pushCollapsed(lines, items, 5);
    }

    // --- No data units (compact comma-joined) ---
    const noDataUnits = unitData.filter((u) => u.current_status === 'no_data');
    if (noDataUnits.length > 0) {
        lines.push('');
        lines.push(`*Belum Ada Data — ${noDataUnits.length} unit*`);
        pushJoined(lines, noDataUnits.map((u) => unitLabel(u)), 2);
    }

    lines.push('');
    lines.push(`_PIMS · ${todayId()}_`);

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

    lines.push('*Pengingat P2H Harian*');
    const subtitle = filters.jenis_unit
        ? `${fmtDateShort(lastDate)} · ${jenisLabel(filters.jenis_unit)}`
        : fmtDateShort(lastDate);
    lines.push(subtitle);

    const notFilled: MatrixRow[] = [];
    const downtimeUnits: MatrixRow[] = [];
    const filledLayak: MatrixRow[] = [];
    const filledBd: MatrixRow[] = [];

    for (const row of matrix) {
        const cell = row.cells[lastDate];
        if (!cell) {
            notFilled.push(row);
        } else if (cell.status === 'downtime') {
            downtimeUnits.push(row);
        } else if (cell.status === 'bd') {
            filledBd.push(row);
        } else {
            filledLayak.push(row);
        }
    }

    // --- Belum P2H: grouped by dept (unit number only, no plate) ---
    lines.push('');
    if (notFilled.length === 0) {
        lines.push('*Semua kendaraan sudah dicek hari ini.*');
    } else {
        lines.push(`*Belum P2H — ${notFilled.length} unit*`);
        const lvNotFilled = notFilled.filter((r) => r.jenis_unit === 'Light Vehicle');
        const busNotFilled = notFilled.filter((r) => r.jenis_unit !== 'Light Vehicle');

        if (lvNotFilled.length > 0) {
            const byDept = groupLvByDept(lvNotFilled);
            for (const [dept, rows] of byDept) {
                lines.push(`${dept}: ${rows.map((r) => r.no_unit).join(', ')}`);
            }
        }
        for (const row of busNotFilled) {
            lines.push(row.no_unit);
        }
    }

    // --- Sedang downtime ---
    if (downtimeUnits.length > 0) {
        lines.push('');
        lines.push(`*Sedang BD/PM — ${downtimeUnits.length} unit*`);
        lines.push('_(P2H tidak diperlukan)_');
        for (const row of downtimeUnits) {
            const tipe = row.cells[lastDate]?.downtime_tipe ?? 'BD';
            lines.push(`${row.no_unit}${deptSuffix(row)} — ${tipe}`);
        }
    }

    // --- Sudah P2H, Layak ---
    if (filledLayak.length > 0) {
        lines.push('');
        lines.push(`*Sudah P2H, Layak — ${filledLayak.length} unit*`);
        const items = filledLayak.map((r) => `${unitLabel(r)}${deptSuffix(r)}`);
        pushCollapsed(lines, items, 5);
    }

    // --- Sudah P2H, Rusak ---
    if (filledBd.length > 0) {
        lines.push('');
        lines.push(`*Sudah P2H, Rusak — ${filledBd.length} unit*`);
        for (const row of filledBd) {
            lines.push(`${unitLabel(row)}${deptSuffix(row)}`);
        }
    }

    lines.push('');
    lines.push(`_PIMS · ${todayId()}_`);

    return lines.join('\n');
}

// ── P2H Historical Report Formatter ──────────────────────────────────────────

export function formatP2hHistoryReport(
    matrix: MatrixRow[],
    summary: P2hSummary,
    filters: P2hFilters,
): string {
    const lines: string[] = [];

    lines.push('*Laporan Kepatuhan P2H*');
    const rangeStr = `${fmtDate(filters.date_from)} – ${fmtDate(filters.date_to)}`;
    lines.push(filters.jenis_unit ? `${rangeStr} · ${jenisLabel(filters.jenis_unit)}` : rangeStr);

    if (summary.total_bd_days > 0) {
        lines.push('');
        lines.push(`Hari rusak : ${summary.total_bd_days} hari`);
    }

    const sorted = [...matrix].sort((a, b) => a.compliance_pct - b.compliance_pct);
    const poor = sorted.filter((r) => r.compliance_pct < 70);
    const fair = sorted.filter((r) => r.compliance_pct >= 70 && r.compliance_pct < 90);
    const good = sorted.filter((r) => r.compliance_pct >= 90);

    if (poor.length > 0) {
        lines.push('');
        lines.push(`*Perlu Perhatian — di bawah 70% (${poor.length} unit)*`);
        const items = poor.map((r) => `${unitLabel(r)}${deptSuffix(r)} — ${r.compliance_pct}% · ${r.filled_days}/${r.total_days} hari`);
        pushCollapsed(lines, items, 10);
    }

    if (fair.length > 0) {
        lines.push('');
        lines.push(`*Cukup Baik — 70% s.d. 89% (${fair.length} unit)*`);
        const items = fair.map((r) => `${unitLabel(r)}${deptSuffix(r)} — ${r.compliance_pct}% · ${r.filled_days}/${r.total_days} hari`);
        pushCollapsed(lines, items, 10);
    }

    if (good.length > 0) {
        lines.push('');
        lines.push(`*Baik — 90% ke atas (${good.length} unit)*`);
        const items = good.map((r) => {
            const detail = r.compliance_pct === 100 ? 'sempurna' : `${r.compliance_pct}% · ${r.filled_days}/${r.total_days} hari`;
            return `${unitLabel(r)}${deptSuffix(r)} — ${detail}`;
        });
        pushCollapsed(lines, items, 5);
    }

    lines.push('');
    lines.push(`_PIMS · ${todayId()}_`);

    return lines.join('\n');
}
