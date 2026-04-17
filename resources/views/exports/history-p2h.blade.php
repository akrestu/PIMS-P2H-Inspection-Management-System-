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
    .stats { margin: 0 20px 12px; display: table; width: calc(100% - 40px); }
    .stat-box { display: table-cell; border: 1px solid #ddd; padding: 6px 10px; text-align: center; }
    .stat-box + .stat-box { border-left: none; }
    .stat-box .label { font-size: 7.5px; color: #666; }
    .stat-box .value { font-size: 15px; font-weight: bold; margin-top: 2px; }
    .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; }
    table { width: calc(100% - 40px); margin: 0 20px; border-collapse: collapse; }
    thead th { background: #1E3A5F; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
    .text-center { text-align: center; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7px; font-weight: bold; }
    .badge-layak { background: #dcfce7; color: #15803d; }
    .badge-tl    { background: #fee2e2; color: #b91c1c; }
    .badge-done  { background: #dbeafe; color: #1d4ed8; }
    .badge-open  { background: #f3f4f6; color: #6b7280; }
    .footer { margin-top: 14px; padding: 8px 20px 0; border-top: 1px solid #e5e7eb; font-size: 7.5px; color: #888; }
</style>
</head>
<body>

<div class="page-header">
    <h1>Laporan Riwayat P2H — Pemeriksaan &amp; Perawatan Harian</h1>
    <p>
        PT. Wahana Bandhawa Kencana &nbsp;·&nbsp;
        @if (!empty($filters['date_from']) || !empty($filters['date_to']))
            Periode: {{ $filters['date_from'] ?? '-' }} s/d {{ $filters['date_to'] ?? '-' }}
        @else
            Semua periode
        @endif
        @if (!empty($filters['jenis_unit'])) &nbsp;·&nbsp; {{ $filters['jenis_unit'] }} @endif
        @if (!empty($filters['no_unit'])) &nbsp;·&nbsp; Unit: {{ $filters['no_unit'] }} @endif
    </p>
    <p>Dicetak: {{ now()->locale('id')->isoFormat('dddd, D MMMM YYYY HH:mm') }}</p>
</div>

{{-- Quick stats --}}
@php
    $totalSessions = count($sessions);
    $adaTl = collect($sessions)->where('total_tl', '>', 0)->count();
    $semuaLayak = $totalSessions - $adaTl;
    $completed = collect($sessions)->where('status', 'completed')->count();
@endphp

<div class="stats">
    <div class="stat-box">
        <div class="label">Total Sesi</div>
        <div class="value blue">{{ $totalSessions }}</div>
    </div>
    <div class="stat-box">
        <div class="label">Semua Layak</div>
        <div class="value green">{{ $semuaLayak }}</div>
    </div>
    <div class="stat-box">
        <div class="label">Ada Item TL</div>
        <div class="value red">{{ $adaTl }}</div>
    </div>
    <div class="stat-box">
        <div class="label">Sesi Selesai</div>
        <div class="value">{{ $completed }}</div>
    </div>
    <div class="stat-box">
        <div class="label">Tingkat Kelayakan</div>
        <div class="value {{ $totalSessions > 0 && ($semuaLayak / $totalSessions * 100) >= 90 ? 'green' : 'red' }}">
            {{ $totalSessions > 0 ? round($semuaLayak / $totalSessions * 100, 1) : 0 }}%
        </div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>No.</th>
            <th>Tanggal</th>
            <th>No. Unit</th>
            <th>Jenis Unit</th>
            <th class="text-center">Slot</th>
            <th class="text-center">Item TL</th>
            <th class="text-center">Kelayakan</th>
            <th class="text-center">Status Sesi</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($sessions as $i => $s)
        <tr>
            <td class="text-center">{{ $i + 1 }}</td>
            <td>{{ $s['tanggal'] }}</td>
            <td><strong>{{ $s['no_unit'] }}</strong></td>
            <td>{{ $s['jenis_unit'] }}</td>
            <td class="text-center">{{ $s['slot_terisi'] }}/4</td>
            <td class="text-center {{ $s['total_tl'] > 0 ? 'red' : 'green' }}">
                {{ $s['total_tl'] > 0 ? $s['total_tl'] : '0' }}
            </td>
            <td class="text-center">
                @if ($s['total_tl'] > 0)
                    <span class="badge badge-tl">Ada TL</span>
                @else
                    <span class="badge badge-layak">Layak</span>
                @endif
            </td>
            <td class="text-center">
                @if ($s['status'] === 'completed')
                    <span class="badge badge-done">Selesai</span>
                @else
                    <span class="badge badge-open">Open</span>
                @endif
            </td>
        </tr>
        @endforeach

        @if ($totalSessions === 0)
        <tr>
            <td colspan="8" class="text-center" style="padding: 20px; color: #9ca3af; font-style: italic;">
                Tidak ada data P2H untuk filter yang dipilih.
            </td>
        </tr>
        @endif
    </tbody>
</table>

<div class="footer">
    <p>Total {{ $totalSessions }} sesi P2H · {{ $semuaLayak }} layak · {{ $adaTl }} ada item TL</p>
    <p style="margin-top:3px;">Dokumen ini digenerate otomatis oleh sistem PIMS — PT. Wahana Bandhawa Kencana</p>
</div>

</body>
</html>
