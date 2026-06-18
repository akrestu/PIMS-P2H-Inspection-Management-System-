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
    if (jenis === 'Light Vehicle') return 'Kendaraan Ringan (LV)';
    if (jenis === 'Bus') return 'Bus';
    return jenis;
}

function unitLabel(row: { no_unit: string; jenis_unit: string; no_lambung: string | null }): string {
    const lambung = row.no_lambung ? ` (No. Lambung: ${row.no_lambung})` : '';
    return `${row.no_unit}${lambung}`;
}

// ── PA Monitoring Formatter ───────────────────────────────────────────────────

export function formatPaReport(unitData: UnitPA[], summary: PaSummary, filters: PaFilters): string {
    const threshold = summary.pa_threshold;
    const lines: string[] = [];

    lines.push('*LAPORAN KETERSEDIAAN KENDARAAN*');
    lines.push(`Periode  : ${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    if (filters.jenis_unit) {
        lines.push(`Kategori : ${jenisLabel(filters.jenis_unit)}`);
    }
    lines.push('');
    lines.push(
        'Laporan ini menunjukkan seberapa banyak waktu kendaraan tersedia untuk beroperasi (target minimal ' +
        threshold + '% dari total waktu kerja).',
    );

    lines.push('');
    lines.push('*KONDISI ARMADA SAAT INI*');
    lines.push(`- Kendaraan beroperasi normal : ${summary.operation_count} unit`);
    lines.push(`- Kendaraan rusak (breakdown) : ${summary.bd_count} unit`);
    if (summary.no_data_count > 0) {
        lines.push(`- Kendaraan belum ada data   : ${summary.no_data_count} unit`);
    }
    lines.push(`- Total kendaraan dipantau   : ${summary.total_units} unit`);
    lines.push('');
    lines.push(
        `Ketersediaan rata-rata armada: *${summary.fleet_actual_pa !== null ? summary.fleet_actual_pa + '%' : 'belum ada data'}*`,
    );
    lines.push(
        `Kepatuhan pengecekan harian  : *${summary.fleet_compliance_pa !== null ? summary.fleet_compliance_pa + '%' : 'belum ada data'}*`,
    );

    // --- BD units ---
    const bdUnits = unitData.filter((u) => u.current_status === 'bd');
    if (bdUnits.length > 0) {
        lines.push('');
        lines.push(`*KENDARAAN RUSAK / BREAKDOWN (${bdUnits.length} unit)*`);
        lines.push('Kendaraan berikut sedang dalam kondisi rusak dan tidak dapat beroperasi:');
        lines.push('');
        for (const u of bdUnits) {
            const tersedia = u.actual_pa !== null ? `${u.actual_pa}%` : 'belum ada data';
            const wh = u.working_hours > 0 ? `${u.working_hours.toFixed(0)} jam` : '-';
            const dh = u.downtime_hours > 0 ? `${u.downtime_hours.toFixed(0)} jam` : '-';
            lines.push(`${unitLabel(u)} - ${jenisLabel(u.jenis_unit)}`);
            lines.push(`  Waktu tersedia  : ${tersedia} dari total jam kerja`);
            lines.push(`  Jam beroperasi  : ${wh}`);
            lines.push(`  Jam tidak jalan : ${dh}`);
            lines.push(`  Hari beroperasi : ${u.operation_days} hari`);
            lines.push(`  Hari rusak      : ${u.bd_days} hari`);
            lines.push('');
        }
    }

    // --- Operation units below threshold ---
    const belowThreshold = unitData
        .filter((u) => u.current_status === 'operation' && u.actual_pa !== null && u.actual_pa < threshold)
        .sort((a, b) => (a.actual_pa ?? 0) - (b.actual_pa ?? 0));

    if (belowThreshold.length > 0) {
        lines.push(`*KENDARAAN PERLU PERHATIAN - KETERSEDIAAN DI BAWAH ${threshold}% (${belowThreshold.length} unit)*`);
        lines.push(`Kendaraan ini masih beroperasi, namun ketersediaannya di bawah target ${threshold}%:`);
        lines.push('');
        for (const u of belowThreshold) {
            const tersedia = u.actual_pa !== null ? `${u.actual_pa}%` : '-';
            const kepatuhan = u.compliance_pa !== null ? `${u.compliance_pa}%` : '-';
            const dh = u.downtime_hours > 0 ? `${u.downtime_hours.toFixed(0)} jam` : '-';
            lines.push(`${unitLabel(u)} - ${jenisLabel(u.jenis_unit)}`);
            lines.push(`  Waktu tersedia   : ${tersedia} (di bawah target ${threshold}%)`);
            lines.push(`  Kepatuhan cek    : ${kepatuhan}`);
            lines.push(`  Total jam rusak  : ${dh}`);
            lines.push(`  Hari rusak       : ${u.bd_days} hari`);
            lines.push('');
        }
    }

    // --- Normal operation units ---
    const normalUnits = unitData
        .filter((u) => u.current_status === 'operation' && (u.actual_pa === null || u.actual_pa >= threshold))
        .sort((a, b) => (b.actual_pa ?? 0) - (a.actual_pa ?? 0));

    if (normalUnits.length > 0) {
        lines.push(`*KENDARAAN BEROPERASI NORMAL - ${threshold}% KE ATAS (${normalUnits.length} unit)*`);
        for (const u of normalUnits) {
            const tersedia = u.actual_pa !== null ? `${u.actual_pa}%` : 'belum ada data jam';
            const kepatuhan = u.compliance_pa !== null ? `${u.compliance_pa}%` : '-';
            lines.push(`- ${unitLabel(u)} (${jenisLabel(u.jenis_unit)})`);
            lines.push(`  Tersedia ${tersedia}, kepatuhan cek ${kepatuhan}`);
        }
    }

    // --- No data units ---
    const noDataUnits = unitData.filter((u) => u.current_status === 'no_data');
    if (noDataUnits.length > 0) {
        lines.push('');
        lines.push(`*KENDARAAN BELUM ADA DATA (${noDataUnits.length} unit)*`);
        lines.push('Kendaraan berikut belum memiliki catatan penggunaan pada periode ini:');
        for (const u of noDataUnits) {
            lines.push(`- ${unitLabel(u)} (${jenisLabel(u.jenis_unit)})`);
        }
    }

    lines.push('');
    lines.push('-----------------------------');
    lines.push(`_Dikirim otomatis oleh sistem PIMS_`);
    lines.push(`_${todayId()}_`);

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

    const kategori = filters.jenis_unit ? jenisLabel(filters.jenis_unit) : 'Semua Kendaraan';

    lines.push('*PENGINGAT PENGECEKAN KENDARAAN (P2H)*');
    lines.push(`Tanggal  : ${fmtDateShort(lastDate)}`);
    lines.push(`Kategori : ${kategori}`);
    lines.push('');
    lines.push(
        'P2H adalah pengecekan kondisi kendaraan yang wajib dilakukan setiap hari ' +
        'sebelum kendaraan digunakan. Berikut status pengisian hari ini:',
    );

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

    // --- Belum P2H ---
    lines.push('');
    lines.push('-----------------------------');
    if (notFilled.length === 0) {
        lines.push('*SEMUA KENDARAAN SUDAH DICEK*');
        lines.push('Tidak ada kendaraan yang terlewat. Terima kasih!');
    } else {
        lines.push(`*BELUM DILAKUKAN PENGECEKAN (${notFilled.length} kendaraan)*`);
        lines.push('Mohon segera lakukan pengecekan P2H untuk kendaraan berikut:');
        lines.push('');
        for (const row of notFilled) {
            lines.push(`- ${unitLabel(row)} (${jenisLabel(row.jenis_unit)})`);
        }
    }

    // --- Sudah P2H ---
    lines.push('');
    lines.push('-----------------------------');
    if (filledLayak.length === 0 && filledBd.length === 0) {
        lines.push('*BELUM ADA KENDARAAN YANG DICEK HARI INI*');
    } else {
        lines.push(`*SUDAH DILAKUKAN PENGECEKAN (${filledLayak.length + filledBd.length} kendaraan)*`);
        lines.push('');

        if (filledLayak.length > 0) {
            lines.push(`Layak digunakan (${filledLayak.length} kendaraan):`);
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
            lines.push(`Dinyatakan rusak / breakdown (${filledBd.length} kendaraan):`);
            for (const row of filledBd) {
                lines.push(`- ${unitLabel(row)} (${jenisLabel(row.jenis_unit)})`);
            }
        }
    }

    // --- Ringkasan periode ---
    lines.push('');
    lines.push('-----------------------------');
    lines.push('*RINGKASAN PERIODE*');
    lines.push(`Periode  : ${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    lines.push(
        `Tingkat kepatuhan pengisian P2H armada: *${summary.fleet_compliance}%*`,
    );
    lines.push(`Total hari yang terlewat (tidak ada pengecekan): ${summary.total_missed} hari`);
    if (summary.total_bd_days > 0) {
        lines.push(`Total hari kendaraan dinyatakan rusak: ${summary.total_bd_days} hari`);
    }

    lines.push('');
    lines.push('-----------------------------');
    lines.push(`_Dikirim otomatis oleh sistem PIMS_`);
    lines.push(`_${todayId()}_`);

    return lines.join('\n');
}

// ── P2H Historical Report Formatter ──────────────────────────────────────────

export function formatP2hHistoryReport(
    matrix: MatrixRow[],
    summary: P2hSummary,
    filters: P2hFilters,
): string {
    const lines: string[] = [];

    const kategori = filters.jenis_unit ? jenisLabel(filters.jenis_unit) : 'Semua Kendaraan';

    lines.push('*LAPORAN KEPATUHAN PENGECEKAN KENDARAAN (P2H)*');
    lines.push(`Periode  : ${fmtDate(filters.date_from)} s/d ${fmtDate(filters.date_to)}`);
    lines.push(`Kategori : ${kategori}`);
    lines.push('');
    lines.push(
        'Laporan ini merangkum seberapa rutin pengecekan P2H dilakukan ' +
        'oleh setiap kendaraan selama periode di atas.',
    );

    lines.push('');
    lines.push('*RINGKASAN ARMADA*');
    lines.push(`- Tingkat kepatuhan seluruh armada : *${summary.fleet_compliance}%*`);
    lines.push(`- Kendaraan dengan pengecekan sempurna (100%) : ${summary.perfect_units} unit`);
    lines.push(`- Total hari yang terlewat (tidak ada pengecekan) : ${summary.total_missed} hari`);
    if (summary.total_bd_days > 0) {
        lines.push(`- Total hari dinyatakan rusak : ${summary.total_bd_days} hari`);
    }
    lines.push(`- Total kendaraan dipantau : ${summary.total_units} unit`);

    const sorted = [...matrix].sort((a, b) => a.compliance_pct - b.compliance_pct);

    const poor = sorted.filter((r) => r.compliance_pct < 70);
    const fair = sorted.filter((r) => r.compliance_pct >= 70 && r.compliance_pct < 90);
    const good = sorted.filter((r) => r.compliance_pct >= 90);

    // --- Perlu perhatian ---
    if (poor.length > 0) {
        lines.push('');
        lines.push('-----------------------------');
        lines.push(`*PERLU PERHATIAN - Kepatuhan di bawah 70% (${poor.length} kendaraan)*`);
        lines.push('Kendaraan berikut sering melewatkan pengecekan harian:');
        lines.push('');
        for (const r of poor) {
            const missed = r.total_days - r.filled_days;
            lines.push(`${unitLabel(r)} - ${jenisLabel(r.jenis_unit)}`);
            lines.push(
                `  Dicek ${r.filled_days} dari ${r.total_days} hari (${r.compliance_pct}%)`,
            );
            lines.push(`  Tidak dicek sebanyak ${missed} hari`);
            lines.push('');
        }
    }

    // --- Cukup baik ---
    if (fair.length > 0) {
        lines.push('');
        lines.push('-----------------------------');
        lines.push(`*CUKUP BAIK - Kepatuhan 70% sampai 89% (${fair.length} kendaraan)*`);
        lines.push('');
        for (const r of fair) {
            const missed = r.total_days - r.filled_days;
            lines.push(`- ${unitLabel(r)} (${jenisLabel(r.jenis_unit)})`);
            lines.push(
                `  Dicek ${r.filled_days} dari ${r.total_days} hari (${r.compliance_pct}%), terlewat ${missed} hari`,
            );
        }
    }

    // --- Baik ---
    if (good.length > 0) {
        lines.push('');
        lines.push('-----------------------------');
        lines.push(`*BAIK - Kepatuhan 90% ke atas (${good.length} kendaraan)*`);
        lines.push('');
        for (const r of good) {
            const label =
                r.compliance_pct === 100
                    ? `Sempurna! Dicek setiap hari (${r.total_days}/${r.total_days} hari)`
                    : `Dicek ${r.filled_days} dari ${r.total_days} hari (${r.compliance_pct}%)`;
            lines.push(`- ${unitLabel(r)} (${jenisLabel(r.jenis_unit)})`);
            lines.push(`  ${label}`);
        }
    }

    lines.push('');
    lines.push('-----------------------------');
    lines.push(`_Dikirim otomatis oleh sistem PIMS_`);
    lines.push(`_${todayId()}_`);

    return lines.join('\n');
}
