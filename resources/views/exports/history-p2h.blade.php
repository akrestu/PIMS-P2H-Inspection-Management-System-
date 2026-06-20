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
    table { width: calc(100% - 40px); margin: 0 20px; border-collapse: collapse; }
    thead th { background: #1E3A5F; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; vertical-align: top; }
    .text-center { text-align: center; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7px; font-weight: bold; }
    .badge-op  { background: #dcfce7; color: #15803d; }
    .badge-bd  { background: #fee2e2; color: #b91c1c; }
    .badge-na  { background: #f3f4f6; color: #6b7280; }
    .red { color: #dc2626; }
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

<table>
    <thead>
        <tr>
            <th style="width:24px">No.</th>
            <th style="width:60px">Tanggal</th>
            <th style="width:36px">Shift</th>
            <th style="width:70px">No. Unit</th>
            <th style="width:60px">Jenis Unit</th>
            <th style="width:80px">User</th>
            <th>Hasil Pemeriksaan</th>
            <th style="width:44px" class="text-center">Status</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($sessions as $i => $r)
        <tr>
            <td class="text-center">{{ $i + 1 }}</td>
            <td>{{ $r['tanggal'] }}</td>
            <td class="text-center">{{ $r['shift'] }}</td>
            <td><strong>{{ $r['no_unit'] }}</strong></td>
            <td>{{ $r['jenis_unit'] }}</td>
            <td>{{ $r['user'] }}</td>
            <td class="{{ str_starts_with($r['hasil_detail'], 'TL:') ? 'red' : '' }}">
                {{ $r['hasil_detail'] }}
            </td>
            <td class="text-center">
                @if ($r['status_unit'] === 'OP')
                    <span class="badge badge-op">OP</span>
                @elseif ($r['status_unit'] === 'BD')
                    <span class="badge badge-bd">BD</span>
                @else
                    <span class="badge badge-na">-</span>
                @endif
            </td>
        </tr>
        @empty
        <tr>
            <td colspan="8" class="text-center" style="padding: 20px; color: #9ca3af; font-style: italic;">
                Tidak ada data P2H untuk filter yang dipilih.
            </td>
        </tr>
        @endforelse
    </tbody>
</table>

<div class="footer">
    <p>Total {{ count($sessions) }} entri P2H · Dokumen digenerate otomatis oleh sistem PIMS — PT. Wahana Bandhawa Kencana</p>
</div>

</body>
</html>
