<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Periodic Report P2H {{ $report['periode']['label'] }}</title>
    <style>
        @page { size: A4 portrait; margin: 14mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; line-height: 1.35; }
        h1 { font-size: 16px; margin: 0; letter-spacing: .5px; }
        .sub { color: #555; font-size: 10px; margin-top: 2px; }
        .meta { margin: 8px 0 12px; font-size: 10px; }
        .meta td { padding: 1px 10px 1px 0; }
        h2 { font-size: 11px; margin: 14px 0 6px; padding: 4px 6px; background: #1f2937; color: #fff; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th, table.data td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
        table.data th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
        .kpi { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px; }
        .kpi td { border: 1px solid #cbd5e1; padding: 6px 8px; width: 25%; }
        .kpi .v { font-size: 16px; font-weight: bold; }
        .kpi .l { font-size: 8.5px; color: #555; text-transform: uppercase; }
        .red { color: #b91c1c; } .amber { color: #b45309; } .green { color: #15803d; }
        .muted { color: #777; }
        .footer { margin-top: 18px; font-size: 8.5px; color: #777; border-top: 1px solid #ccc; padding-top: 4px; }
    </style>
</head>
<body>
    @php
        $k = $report['kepatuhan'];
        $t = $report['temuan'];
        $b = $report['bbm'];
        $n = fn ($v) => number_format((float) $v, 0, ',', '.');
    @endphp

    <h1>PERIODIC REPORT P2H</h1>
    <div class="sub">Evaluasi Pemeriksaan Harian Kendaraan</div>
    <table class="meta">
        <tr><td><b>Periode</b></td><td>{{ $report['periode']['label'] }} ({{ $report['periode']['jumlah_hari'] }} hari)</td></tr>
        <tr><td><b>Jenis unit</b></td><td>{{ $report['jenis_unit'] ?? 'Semua Unit' }}</td></tr>
        <tr><td><b>Site</b></td><td>{{ $report['site'] ?? 'Semua Site' }}</td></tr>
    </table>

    <table class="kpi">
        <tr>
            <td><div class="v">{{ $k['persen'] ?? 0 }}%</div><div class="l">Kepatuhan P2H ({{ $k['p2h_masuk'] }}/{{ $k['p2h_seharusnya'] }})</div></td>
            <td><div class="v">{{ $t['total'] }}</div><div class="l">Total temuan (AA: {{ $t['kode_aa'] }})</div></td>
            <td><div class="v green">{{ $t['closed'] }}</div><div class="l">Temuan closed</div></td>
            <td><div class="v">{{ $t['rata_rata_hari_penyelesaian'] ?? '-' }}</div><div class="l">Rata-rata hari penyelesaian</div></td>
        </tr>
    </table>

    <h2>A. STATUS TEMUAN</h2>
    <table class="data">
        <tr><th>Open</th><th>On Progress</th><th>Closed</th><th>Belum ada PIC</th></tr>
        <tr>
            <td class="red">{{ $t['open'] }}</td>
            <td class="amber">{{ $t['progress'] }}</td>
            <td class="green">{{ $t['closed'] }}</td>
            <td>{{ $t['tanpa_pic'] }}</td>
        </tr>
    </table>

    @if ($report['item_teratas'])
        <h2>B. ITEM PALING SERING BERMASALAH</h2>
        <table class="data">
            <tr><th style="width:30px">#</th><th>Item</th><th style="width:80px">Jumlah</th></tr>
            @foreach ($report['item_teratas'] as $i => $row)
                <tr><td>{{ $i + 1 }}</td><td>{{ $row['item'] }}</td><td>{{ $row['jumlah'] }}x</td></tr>
            @endforeach
        </table>
    @endif

    @if ($report['unit_teratas'])
        <h2>C. UNIT DENGAN TEMUAN TERBANYAK</h2>
        <table class="data">
            <tr><th style="width:30px">#</th><th>Unit</th><th>Jenis</th><th>Temuan</th><th>Belum selesai</th></tr>
            @foreach ($report['unit_teratas'] as $i => $row)
                <tr><td>{{ $i + 1 }}</td><td>{{ $row['no_unit'] }}</td><td>{{ $row['jenis_unit'] }}</td><td>{{ $row['jumlah'] }}</td><td>{{ $row['belum_selesai'] }}</td></tr>
            @endforeach
        </table>
    @endif

    @if ($report['berulang'] || $report['overdue'])
        <h2>D. PERLU PERHATIAN</h2>
        <table class="data">
            <tr><th>Unit</th><th>Item</th><th>Keterangan</th></tr>
            @foreach ($report['berulang'] as $row)
                <tr><td>{{ $row['no_unit'] }}</td><td>{{ $row['item'] }}</td><td>Berulang {{ $row['jumlah'] }}x dalam periode</td></tr>
            @endforeach
            @foreach ($report['overdue'] as $row)
                <tr><td>{{ $row['no_unit'] }}</td><td>{{ $row['item'] }}</td><td class="red">Lewat target {{ $row['hari_terlambat'] }} hari · PIC: {{ $row['pic'] ?? 'Belum ditunjuk' }}</td></tr>
            @endforeach
        </table>
    @endif

    <h2>E. KONSUMSI BBM</h2>
    <table class="data">
        <tr><th>Total BBM</th><th>Total jarak</th><th>Rata-rata km/liter</th><th>Pengisian tidak wajar</th></tr>
        <tr>
            <td>{{ $n($b['total_liter']) }} liter</td>
            <td>{{ $n($b['total_jarak']) }} km</td>
            <td>
                @forelse ($b['rata_rata_km_per_liter'] as $jenis => $avg)
                    {{ $jenis }}: {{ $avg }}<br>
                @empty
                    <span class="muted">-</span>
                @endforelse
            </td>
            <td>{{ $b['jumlah_anomali'] }}</td>
        </tr>
    </table>
    @if ($b['unit_boros'])
        <table class="data" style="margin-top:6px">
            <tr><th>Unit boros</th><th>km/liter</th><th>Rata-rata jenis</th></tr>
            @foreach ($b['unit_boros'] as $row)
                <tr><td>{{ $row['no_unit'] }}</td><td class="red">{{ $row['km_per_liter'] }}</td><td>{{ $row['rata_rata_jenis'] }}</td></tr>
            @endforeach
        </table>
    @endif

    @if ($report['servis'])
        <h2>F. JADWAL SERVIS BERKALA</h2>
        <table class="data">
            <tr><th>Unit</th><th>KM saat ini</th><th>Jadwal servis</th><th>Sisa</th><th>Status</th></tr>
            @foreach ($report['servis'] as $row)
                <tr>
                    <td>{{ $row['no_unit'] }}</td>
                    <td>{{ $n($row['km_saat_ini']) }}</td>
                    <td>{{ $n($row['km_servis_berikutnya']) }}</td>
                    <td>{{ $n($row['sisa_km']) }} km{{ $row['estimasi_hari'] ? ' (±'.$row['estimasi_hari'].' hari)' : '' }}</td>
                    <td class="{{ $row['status'] === 'overdue' ? 'red' : 'amber' }}">{{ $row['status'] === 'overdue' ? 'Terlambat' : 'Segera' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <div class="footer">Dicetak {{ now()->format('d/m/Y H:i') }} · PIMS - P2H Management System</div>
</body>
</html>
