<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 9px; color: #1a1a1a; background: #fff; }
    .page-header { padding: 14px 20px 10px; border-bottom: 2px solid #1E3A5F; margin-bottom: 12px; }
    .page-header h1 { font-size: 15px; font-weight: bold; color: #1E3A5F; }
    .page-header p { font-size: 8.5px; color: #555; margin-top: 2px; }
    .summary-grid { display: table; width: 100%; margin: 0 20px 12px; width: calc(100% - 40px); }
    .summary-card { display: table-cell; border: 1px solid #ddd; border-radius: 4px; padding: 7px 10px; text-align: center; width: 20%; }
    .summary-card + .summary-card { border-left: none; }
    .summary-card .label { font-size: 7.5px; color: #666; margin-bottom: 3px; }
    .summary-card .value { font-size: 16px; font-weight: bold; }
    .summary-card .sub { font-size: 7px; color: #888; margin-top: 2px; }
    .green { color: #16a34a; } .red { color: #dc2626; } .yellow { color: #ca8a04; } .gray { color: #6b7280; }
    table { width: calc(100% - 40px); margin: 0 20px; border-collapse: collapse; }
    thead th { background: #1E3A5F; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #f1f5f9; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7px; font-weight: bold; }
    .badge-op { background: #dcfce7; color: #15803d; }
    .badge-bd { background: #fee2e2; color: #b91c1c; }
    .badge-nd { background: #f3f4f6; color: #6b7280; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer { margin-top: 14px; padding: 8px 20px 0; border-top: 1px solid #e5e7eb; font-size: 7.5px; color: #888; }
    .section-title { margin: 10px 20px 6px; font-size: 10px; font-weight: bold; color: #1E3A5F; border-left: 3px solid #1E3A5F; padding-left: 6px; }
</style>
</head>
<body>

<div class="page-header">
    <h1>Laporan Monitoring PA — Physical Availability</h1>
    <p>PT. Wahana Bandhawa Kencana &nbsp;·&nbsp; Periode: {{ $dateFrom }} s/d {{ $dateTo }}</p>
    <p>Dicetak: {{ now()->locale('id')->isoFormat('dddd, D MMMM YYYY HH:mm') }}</p>
</div>

{{-- Summary Cards --}}
<div class="summary-grid">
    <div class="summary-card">
        <div class="label">PA Aktual Fleet</div>
        <div class="value {{ $summary['fleet_actual_pa'] !== null ? ($summary['fleet_actual_pa'] >= 90 ? 'green' : ($summary['fleet_actual_pa'] >= 75 ? 'yellow' : 'red')) : 'gray' }}">
            {{ $summary['fleet_actual_pa'] !== null ? $summary['fleet_actual_pa'].'%' : '—' }}
        </div>
        <div class="sub">W÷(W+S)×100</div>
    </div>
    <div class="summary-card">
        <div class="label">Kelayakan P2H</div>
        <div class="value {{ $summary['fleet_compliance_pa'] !== null ? ($summary['fleet_compliance_pa'] >= 90 ? 'green' : ($summary['fleet_compliance_pa'] >= 75 ? 'yellow' : 'red')) : 'gray' }}">
            {{ $summary['fleet_compliance_pa'] !== null ? $summary['fleet_compliance_pa'].'%' : '—' }}
        </div>
        <div class="sub">Rata-rata compliance P2H</div>
    </div>
    <div class="summary-card">
        <div class="label">Operation</div>
        <div class="value green">{{ $summary['operation_count'] }}</div>
        <div class="sub">unit beroperasi</div>
    </div>
    <div class="summary-card">
        <div class="label">Breakdown</div>
        <div class="value red">{{ $summary['bd_count'] }}</div>
        <div class="sub">unit masalah</div>
    </div>
    <div class="summary-card">
        <div class="label">Total Unit</div>
        <div class="value">{{ $summary['total_units'] }}</div>
        <div class="sub">{{ $summary['no_data_count'] > 0 ? $summary['no_data_count'].' belum ada data' : 'semua aktif' }}</div>
    </div>
</div>

<div class="section-title">Detail Per Unit</div>

<table>
    <thead>
        <tr>
            <th>No. Unit</th>
            <th>Jenis</th>
            <th>No. Lambung</th>
            <th class="text-center">PA Aktual</th>
            <th class="text-center">Kelayakan P2H</th>
            <th class="text-center">Status</th>
            <th class="text-right">Working (j)</th>
            <th class="text-right">Downtime (j)</th>
            <th class="text-center">Hari Op</th>
            <th class="text-center">Hari BD</th>
            <th class="text-center">Total TL</th>
            <th>Terakhir P2H</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($unitData as $unit)
        <tr>
            <td><strong>{{ $unit['no_unit'] }}</strong></td>
            <td>{{ $unit['jenis_unit'] }}</td>
            <td>{{ $unit['no_lambung'] ?? '-' }}</td>
            <td class="text-center {{ $unit['actual_pa'] !== null ? ($unit['actual_pa'] >= 90 ? 'green' : ($unit['actual_pa'] >= 75 ? 'yellow' : 'red')) : 'gray' }}">
                <strong>{{ $unit['actual_pa'] !== null ? $unit['actual_pa'].'%' : '—' }}</strong>
            </td>
            <td class="text-center {{ $unit['compliance_pa'] !== null ? ($unit['compliance_pa'] >= 90 ? 'green' : ($unit['compliance_pa'] >= 75 ? 'yellow' : 'red')) : 'gray' }}">
                {{ $unit['compliance_pa'] !== null ? $unit['compliance_pa'].'%' : '—' }}
            </td>
            <td class="text-center">
                @if ($unit['current_status'] === 'operation')
                    <span class="badge badge-op">Operation</span>
                @elseif ($unit['current_status'] === 'bd')
                    <span class="badge badge-bd">Breakdown</span>
                @else
                    <span class="badge badge-nd">No Data</span>
                @endif
            </td>
            <td class="text-right">{{ $unit['working_hours'] }}</td>
            <td class="text-right">{{ $unit['downtime_hours'] }}</td>
            <td class="text-center">{{ $unit['operation_days'] }}</td>
            <td class="text-center {{ $unit['bd_days'] > 0 ? 'red' : '' }}">{{ $unit['bd_days'] }}</td>
            <td class="text-center {{ $unit['total_tl'] > 0 ? 'red' : 'green' }}">{{ $unit['total_tl'] }}</td>
            <td>{{ $unit['latest_date'] ?? '-' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    <p>
        <strong>PA Aktual</strong> = W ÷ (W + S) × 100% &nbsp;|&nbsp;
        <strong>W</strong> = Jumlah shift P2H × {{ $summary['shift_hours'] }} jam &nbsp;|&nbsp;
        <strong>S</strong> = Total jam downtime log &nbsp;|&nbsp;
        Threshold kelayakan: <strong>{{ $summary['pa_threshold'] }}%</strong>
    </p>
    <p style="margin-top:3px;">Dokumen ini digenerate otomatis oleh sistem PIMS — PT. Wahana Bandhawa Kencana</p>
</div>

</body>
</html>
