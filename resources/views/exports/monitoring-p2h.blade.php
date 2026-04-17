<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 8px; color: #1a1a1a; background: #fff; }
    .page-header { padding: 12px 16px 8px; border-bottom: 2px solid #1E3A5F; margin-bottom: 10px; }
    .page-header h1 { font-size: 14px; font-weight: bold; color: #1E3A5F; }
    .page-header p { font-size: 8px; color: #555; margin-top: 2px; }
    .summary-grid { display: table; width: calc(100% - 32px); margin: 0 16px 10px; }
    .summary-card { display: table-cell; border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
    .summary-card + .summary-card { border-left: none; }
    .summary-card .label { font-size: 7px; color: #666; margin-bottom: 2px; }
    .summary-card .value { font-size: 14px; font-weight: bold; }
    .green { color: #16a34a; } .red { color: #dc2626; } .yellow { color: #ca8a04; } .gray { color: #6b7280; }
    .section-title { margin: 8px 16px 5px; font-size: 9px; font-weight: bold; color: #1E3A5F; border-left: 3px solid #1E3A5F; padding-left: 5px; }
    table.matrix { width: calc(100% - 32px); margin: 0 16px; border-collapse: collapse; table-layout: auto; }
    table.matrix th { background: #1E3A5F; color: #fff; padding: 4px 3px; text-align: center; font-size: 7px; white-space: nowrap; }
    table.matrix th.unit-col { text-align: left; min-width: 80px; }
    table.matrix td { padding: 3px; border-bottom: 1px solid #e5e7eb; font-size: 7px; text-align: center; white-space: nowrap; }
    table.matrix td.unit-name { text-align: left; font-weight: bold; }
    table.matrix td.unit-type { text-align: left; font-size: 6.5px; color: #666; }
    table.matrix tbody tr:nth-child(even) { background: #f8fafc; }
    .cell-layak   { background: #dcfce7; color: #15803d; border-radius: 2px; padding: 1px 2px; }
    .cell-bd      { background: #fee2e2; color: #b91c1c; border-radius: 2px; padding: 1px 2px; }
    .cell-partial { background: #fef9c3; color: #a16207; border-radius: 2px; padding: 1px 2px; }
    .cell-empty   { color: #d1d5db; }
    .compliance-good { color: #16a34a; font-weight: bold; }
    .compliance-ok   { color: #ca8a04; font-weight: bold; }
    .compliance-bad  { color: #dc2626; font-weight: bold; }
    .footer-row td  { background: #f3f4f6 !important; font-weight: bold; font-size: 7px; }
    .legend { margin: 8px 16px; display: table; width: calc(100% - 32px); font-size: 7.5px; color: #555; }
    .legend-item { display: table-cell; padding: 2px 6px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 3px; vertical-align: middle; }
    .dot-layak { background: #dcfce7; border: 1px solid #16a34a; }
    .dot-bd { background: #fee2e2; border: 1px solid #dc2626; }
    .dot-partial { background: #fef9c3; border: 1px solid #ca8a04; }
    .dot-empty { background: #f3f4f6; border: 1px solid #d1d5db; }
    .footer { margin-top: 10px; padding: 6px 16px 0; border-top: 1px solid #e5e7eb; font-size: 7px; color: #888; }
</style>
</head>
<body>

<div class="page-header">
    <h1>Laporan Monitoring P2H — Compliance Matrix</h1>
    <p>PT. Wahana Bandhawa Kencana &nbsp;·&nbsp; Periode: {{ $dateFrom }} s/d {{ $dateTo }}{{ $jenisUnit ? ' · '.$jenisUnit : '' }}</p>
    <p>Dicetak: {{ now()->locale('id')->isoFormat('dddd, D MMMM YYYY HH:mm') }}</p>
</div>

{{-- Summary --}}
<div class="summary-grid">
    <div class="summary-card">
        <div class="label">Fleet Compliance</div>
        <div class="value {{ $summary['fleet_compliance'] >= 90 ? 'green' : ($summary['fleet_compliance'] >= 70 ? 'yellow' : 'red') }}">
            {{ $summary['fleet_compliance'] }}%
        </div>
    </div>
    <div class="summary-card">
        <div class="label">Unit Sempurna</div>
        <div class="value green">{{ $summary['perfect_units'] }}</div>
    </div>
    <div class="summary-card">
        <div class="label">Total Hari Kosong</div>
        <div class="value red">{{ $summary['total_missed'] }}</div>
    </div>
    <div class="summary-card">
        <div class="label">Total Hari BD</div>
        <div class="value red">{{ $summary['total_bd_days'] }}</div>
    </div>
    <div class="summary-card">
        <div class="label">Total Unit</div>
        <div class="value">{{ $summary['total_units'] }}</div>
    </div>
    <div class="summary-card">
        <div class="label">Total Hari</div>
        <div class="value">{{ $summary['total_days'] }}</div>
    </div>
</div>

{{-- Legend --}}
<div class="legend">
    <span class="legend-item"><span class="dot dot-layak"></span> Layak (4 slot)</span>
    <span class="legend-item"><span class="dot dot-bd"></span> Breakdown</span>
    <span class="legend-item"><span class="dot dot-partial"></span> Sebagian (&lt; 4 slot)</span>
    <span class="legend-item"><span class="dot dot-empty"></span> Tidak ada P2H</span>
    <span class="legend-item" style="color:#888;">Angka = slot terisi / 4</span>
</div>

<div class="section-title">Compliance Matrix</div>

<table class="matrix">
    <thead>
        <tr>
            <th class="unit-col" colspan="2">Unit</th>
            @foreach ($dates as $date)
                @php
                    [$y, $m, $d] = explode('-', $date);
                    $months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                    $label = $d.' '.($months[$m-1] ?? $m);
                @endphp
                <th>{{ $label }}</th>
            @endforeach
            <th>Compliance</th>
            <th>Hari Isi</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($matrix as $row)
        <tr>
            <td class="unit-name">{{ $row['no_unit'] }}</td>
            <td class="unit-type">
                {{ $row['jenis_unit'] === 'Bus' ? 'Bus' : 'LV' }}
                @if ($row['no_lambung']) · {{ $row['no_lambung'] }} @endif
            </td>
            @foreach ($dates as $date)
                @php $cell = $row['cells'][$date] ?? null; @endphp
                <td>
                    @if ($cell)
                        <span class="cell-{{ $cell['status'] }}">{{ $cell['slots_filled'] }}/4</span>
                    @else
                        <span class="cell-empty">–</span>
                    @endif
                </td>
            @endforeach
            <td class="{{ $row['compliance_pct'] >= 90 ? 'compliance-good' : ($row['compliance_pct'] >= 70 ? 'compliance-ok' : 'compliance-bad') }}">
                {{ $row['compliance_pct'] }}%
            </td>
            <td class="text-center">{{ $row['filled_days'] }}/{{ $row['total_days'] }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="footer-row">
            <td colspan="2">TOTAL</td>
            @foreach ($dates as $date)
                @php $col = $columnSummary[$date]; @endphp
                <td>{{ $col['filled'] }}/{{ $col['total'] }}</td>
            @endforeach
            <td class="{{ $summary['fleet_compliance'] >= 90 ? 'compliance-good' : ($summary['fleet_compliance'] >= 70 ? 'compliance-ok' : 'compliance-bad') }}">
                {{ $summary['fleet_compliance'] }}%
            </td>
            <td></td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <p>
        <strong>Layak Pakai</strong> = semua slot dengan kondisi_akhir Layak Pakai atau score ≥ 80% &nbsp;|&nbsp;
        <strong>Breakdown</strong> = ada satu slot kondisi BD &nbsp;|&nbsp;
        <strong>Sebagian</strong> = kurang dari 4 slot terisi
    </p>
    <p style="margin-top:2px;">Dokumen ini digenerate otomatis oleh sistem PIMS — PT. Wahana Bandhawa Kencana</p>
</div>

</body>
</html>
