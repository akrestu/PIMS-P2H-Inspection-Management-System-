<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>P2H {{ $session->unit->no_unit }} - {{ $session->tanggal->format('d/m/Y') }}</title>
    <style>
        @page { size: A4 portrait; margin: 7mm 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 8.5px; color: #000; line-height: 1.2; }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .header-table td { vertical-align: middle; padding: 1px 3px; }
        .title-box { text-align: center; }
        .title-box h2 { font-size: 9.5px; text-transform: uppercase; font-weight: bold; line-height: 1.4; }
        .doc-info { font-size: 7px; text-align: right; line-height: 1.5; }

        .divider { border-top: 2px solid #000; margin: 2px 0; }

        .section-title {
            font-weight: bold; font-size: 8px;
            background: #d0d0d0; padding: 2px 5px;
            margin: 3px 0 1px 0; text-transform: uppercase;
            border-left: 3px solid #555; letter-spacing: 0.3px;
        }

        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .info-table td { padding: 2px 4px; font-size: 8px; border: 1px solid #ccc; }
        .info-table .label { font-weight: bold; width: 22%; background: #f0f0f0; }

        .users-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .users-table th, .users-table td { border: 1px solid #999; padding: 2px 3px; font-size: 7.5px; text-align: center; vertical-align: middle; }
        .users-table th { background: #ddd; font-weight: bold; }
        .users-table .user-label { background: #e8e8e8; font-weight: bold; text-align: left; padding-left: 4px; }

        .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .checklist-table th { background: #444; color: #fff; font-size: 7px; padding: 2px 2px; text-align: center; border: 1px solid #333; }
        .checklist-table td { border: 1px solid #bbb; padding: 1px 2px; font-size: 7.5px; vertical-align: middle; line-height: 1.2; }
        .checklist-table .no-col { text-align: center; width: 16px; }
        .checklist-table .item-col { width: 38%; }
        .checklist-table .risk-col { text-align: center; width: 11%; }
        .checklist-table .cond-col { text-align: center; width: 7%; }
        .checklist-table .ket-col { width: 17%; font-size: 7px; }
        .risk-critical { color: #c00; font-weight: bold; }
        .risk-tinggi { color: #d4500a; font-weight: bold; }
        .risk-sedang { color: #a07000; }
        .risk-rendah { color: #666; }
        .row-critical td { background: #fff5f5; }

        .badge-layak { display:inline-block; background:#e6f4ea; border:1px solid #2d7a3a; color:#2d7a3a; font-weight:bold; padding:0 2px; font-size:6.5px; border-radius:2px; }
        .badge-tl    { display:inline-block; background:#fce8e8; border:1px solid #c00;    color:#c00;    font-weight:bold; padding:0 2px; font-size:6.5px; border-radius:2px; }

        .sig-img { max-width: 70px; max-height: 25px; }

        .service-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .service-table td { padding: 2px 4px; font-size: 8px; border: 1px solid #ccc; vertical-align: top; line-height: 1.6; }

        .bbm-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .bbm-table th, .bbm-table td { border: 1px solid #999; padding: 2px 3px; font-size: 7.5px; text-align: center; vertical-align: middle; }
        .bbm-table th { background: #ddd; }

        .kesimpulan-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
        .kesimpulan-table th, .kesimpulan-table td { border: 1px solid #999; padding: 3px 4px; font-size: 8px; text-align: center; vertical-align: middle; }
        .kesimpulan-table th { background: #ddd; font-size: 7.5px; }
        .layak-text { color: #2d7a3a; font-weight: bold; font-size: 9px; }
        .tl-text    { color: #c00;    font-weight: bold; font-size: 9px; }
        .override-note { font-size: 6.5px; color: #555; margin-top: 1px; }
        .override-badge { font-size: 6px; color: #777; font-style: italic; }

        .catatan-box { border: 1px solid #999; padding: 3px 4px; font-size: 8px; min-height: 14px; }
        .footer { text-align: center; font-size: 6.5px; color: #666; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 3px; }
    </style>
</head>
<body>

{{-- HEADER --}}
<table class="header-table">
    <tr>
        <td style="width:15%; text-align:center; border-right:1px solid #ccc;">
            <div style="font-size:10px; font-weight:bold; letter-spacing:1px;">WBK</div>
            <div style="font-size:6.5px; color:#333;">PT. Wahana Bandhawa Kencana</div>
        </td>
        <td class="title-box" style="width:70%;">
            <h2>Formulir Pemeriksaan &amp; Perawatan Harian (P2H)<br>Unit Sarana &ndash; Bus / Light Vehicle</h2>
        </td>
        <td class="doc-info" style="width:15%; border-left:1px solid #ccc;">
            <div>No. Dok: WBK-HSE-FO-091</div>
            <div>Tgl Terbit: -</div>
            <div>Revisi: -</div>
        </td>
    </tr>
</table>
<div class="divider"></div>

{{-- INFO UNIT --}}
<div class="section-title">Informasi Unit</div>
<table class="info-table">
    <tr>
        <td class="label">Hari / Tanggal</td>
        <td>{{ $session->tanggal->translatedFormat('l, d F Y') }}</td>
        <td class="label">No. Unit</td>
        <td>{{ $session->unit->no_unit }}</td>
    </tr>
    <tr>
        <td class="label">Jenis Unit</td>
        <td>{{ $session->unit->jenis_unit }}</td>
        <td class="label">No. Lambung</td>
        <td>{{ $session->unit->no_lambung ?? '-' }}</td>
    </tr>
</table>

{{-- DATA DRIVER --}}
@php $entries = $session->userEntries; @endphp
<div class="section-title">Data Driver</div>
<table class="users-table">
    <thead>
        <tr>
            <th style="width:18%; text-align:left; padding-left:5px;"></th>
            @foreach($entries as $e)
                <th>
                    P2H #{{ $e->user_slot }}<br>
                    <span style="font-weight:normal; font-size:7px;">{{ $e->user?->name ?? '-' }}</span>
                </th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="user-label">Nama Driver</td>
            @foreach($entries as $entry)
                <td>{{ $entry?->user?->name ?? '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">NIK</td>
            @foreach($entries as $entry)
                <td>{{ $entry?->user?->driver?->nik ?? '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">Department</td>
            @foreach($entries as $entry)
                <td>{{ $entry?->user?->driver?->department ?? '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">Shift</td>
            @foreach($entries as $entry)
                <td>{{ $entry?->shift ?? '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">KM Awal</td>
            @foreach($entries as $entry)
                <td>{{ $entry?->km_awal !== null ? number_format($entry->km_awal, 0, ',', '.') : '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">Paraf</td>
            @foreach($entries as $entry)
                <td style="height:28px;">
                    @if($entry?->paraf_url)
                        <img src="{{ storage_path('app/public/' . $entry->paraf_url) }}" class="sig-img" alt="paraf">
                    @else
                        -
                    @endif
                </td>
            @endforeach
        </tr>
    </tbody>
</table>

{{-- CHECKLIST --}}
<div class="section-title">Checklist Pemeriksaan</div>
<table class="checklist-table">
    <thead>
        <tr>
            <th class="no-col">No</th>
            <th class="item-col" style="text-align:left; padding-left:4px;">Item Periksa</th>
            <th class="risk-col">Risiko</th>
            @foreach($entries as $e)
                <th class="cond-col">P2H #{{ $e->user_slot }}</th>
            @endforeach
            <th class="ket-col">Keterangan</th>
        </tr>
    </thead>
    <tbody>
        @foreach($inspectionItems as $item)
            @php
                $isCritical = $item->risiko === 'Critical';
                $rowClass   = $isCritical ? 'row-critical' : '';
                $riskClass  = match($item->risiko) {
                    'Critical' => 'risk-critical',
                    'Tinggi'   => 'risk-tinggi',
                    'Sedang'   => 'risk-sedang',
                    default    => 'risk-rendah',
                };
                $keterangans = [];
            @endphp
            <tr class="{{ $rowClass }}">
                <td class="no-col">{{ $item->urutan }}</td>
                <td class="item-col">{{ $item->nama_item }}</td>
                <td class="risk-col"><span class="{{ $riskClass }}">{{ $item->risiko }}</span></td>
                @foreach($entries as $entry)
                    @php
                        $answer  = $entry?->answers?->firstWhere('inspection_item_id', $item->id);
                        $kondisi = $answer?->kondisi;
                        if ($kondisi === 'Tidak Layak' && $answer?->keterangan) {
                            $keterangans[] = 'P' . $entry->user_slot . ': ' . $answer->keterangan;
                        }
                    @endphp
                    <td class="cond-col">
                        @if($kondisi === 'Layak')
                            <span class="badge-layak">L</span>
                        @elseif($kondisi === 'Tidak Layak')
                            <span class="badge-tl">TL</span>
                        @else
                            <span style="color:#bbb;">-</span>
                        @endif
                    </td>
                @endforeach
                <td class="ket-col">{{ implode(' | ', $keterangans) ?: '-' }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

{{-- INFORMASI SERVIS --}}
<div class="section-title">Informasi Servis</div>
@php $svc = $session->serviceInfo; @endphp
<table class="service-table">
    <tr>
        <td style="width:30%;">
            <strong>Jenis Servis:</strong><br>
            <div style="margin-top:2px; line-height:1.6;">
                @if($svc?->servis_mingguan) [X] @else [ ] @endif Servis Mingguan<br>
                @if($svc?->servis_berkala) [X] @else [ ] @endif Servis Berkala<br>
                @if($svc?->unschedule_breakdown) [X] @else [ ] @endif Unschedule Service (Break Down)<br>
                @if($svc?->lainnya) [X] Lainnya: {{ $svc->lainnya }} @else [ ] Lainnya @endif
            </div>
        </td>
        <td>
            <strong>Catatan Servis:</strong><br>
            <div style="margin-top:2px;">{{ $svc?->catatan_servis ?? '-' }}</div>
        </td>
    </tr>
</table>

{{-- PENGISIAN BBM --}}
<div class="section-title">Pengisian Bahan Bakar</div>
<table class="bbm-table">
    <thead>
        <tr>
            <th>Driver</th>
            <th>Shift</th>
            <th>KM Unit</th>
            <th>Jumlah Liter</th>
            <th>Paraf</th>
        </tr>
    </thead>
    <tbody>
        @foreach($entries as $entry)
            @if($entry)
                <tr>
                    <td>{{ $entry->user?->name ?? 'User #' . $entry->user_slot }}</td>
                    <td>{{ $entry->shift ?? '-' }}</td>
                    <td>{{ $entry->fuelLog?->km_unit !== null ? number_format($entry->fuelLog->km_unit, 0, ',', '.') : '-' }}</td>
                    <td>{{ $entry->fuelLog?->jumlah_liter ?? '-' }}</td>
                    <td style="width:80px; height:26px;">
                        @if($entry->paraf_url)
                            <img src="{{ storage_path('app/public/' . $entry->paraf_url) }}" class="sig-img" alt="paraf">
                        @else
                            -
                        @endif
                    </td>
                </tr>
            @endif
        @endforeach
    </tbody>
</table>

{{-- KESIMPULAN --}}
<div class="section-title">Kesimpulan</div>
<table class="kesimpulan-table">
    <thead>
        <tr>
            @foreach($entries as $e)
                <th>P2H #{{ $e->user_slot }}<br><span style="font-weight:normal;">{{ $e->user?->name ?? '-' }}</span></th>
            @endforeach
            @for($i = count($entries) + 1; $i <= 4; $i++)
                <th>P2H #{{ $i }}</th>
            @endfor
        </tr>
    </thead>
    <tbody>
        <tr>
            @foreach($entries as $entry)
                @php
                    $kondisiAkhir = $entry?->kondisi_akhir;
                    $justifikasi  = $entry?->justifikasi_kondisi;
                    $hasTL        = $entry?->answers?->where('kondisi', 'Tidak Layak')->count() > 0;
                    $isOverride   = $entry?->is_override ?? false;
                @endphp
                <td>
                    @if($kondisiAkhir)
                        @if(str_contains(strtolower($kondisiAkhir), 'tidak') || str_contains(strtolower($kondisiAkhir), 'bd'))
                            <span class="tl-text">{{ strtoupper($kondisiAkhir) }}</span>
                        @else
                            <span class="layak-text">{{ strtoupper($kondisiAkhir) }}</span>
                        @endif
                        @if($isOverride)
                            <div class="override-badge">(Override)</div>
                        @endif
                        @if($justifikasi)
                            <div class="override-note">{{ $justifikasi }}</div>
                        @endif
                    @elseif($hasTL)
                        <span class="tl-text">TIDAK LAYAK</span>
                    @elseif($entry)
                        <span class="layak-text">LAYAK</span>
                    @else
                        <span style="color:#bbb;">-</span>
                    @endif
                </td>
            @endforeach
            @for($i = count($entries) + 1; $i <= 4; $i++)
                <td><span style="color:#bbb;">-</span></td>
            @endfor
        </tr>
    </tbody>
</table>

{{-- CATATAN KHUSUS --}}
<div class="section-title">Catatan Khusus</div>
<div class="catatan-box">{{ $session->catatan_khusus ?? '-' }}</div>

<div class="footer">
    Dicetak oleh sistem PIMS &ndash; {{ now()->format('d/m/Y H:i') }} | WBK-HSE-FO-091
</div>

</body>
</html>
