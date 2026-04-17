<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>P2H {{ $session->unit->no_unit }} - {{ $session->tanggal->format('d/m/Y') }}</title>
    <style>
        @page { size: A4 portrait; margin: 10mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .header-table td { vertical-align: top; padding: 2px 4px; }
        .title-box { text-align: center; }
        .title-box h2 { font-size: 10px; text-transform: uppercase; font-weight: bold; line-height: 1.4; }
        .title-box .subtitle { font-size: 8px; }
        .doc-info { font-size: 7.5px; text-align: right; }

        .divider { border-top: 2px solid #000; margin: 3px 0; }
        .divider-thin { border-top: 1px solid #000; margin: 3px 0; }

        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .info-table td { padding: 2px 4px; font-size: 8.5px; border: 1px solid #ccc; }
        .info-table .label { font-weight: bold; width: 22%; background: #f0f0f0; }

        .section-title { font-weight: bold; font-size: 9px; background: #d0d0d0; padding: 2px 4px; margin: 4px 0 2px 0; text-transform: uppercase; }

        .users-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .users-table th, .users-table td { border: 1px solid #999; padding: 2px 3px; font-size: 8px; text-align: center; vertical-align: top; }
        .users-table th { background: #ddd; font-weight: bold; }
        .users-table .user-label { background: #e8e8e8; font-weight: bold; font-size: 8px; }

        .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .checklist-table th { background: #555; color: #fff; font-size: 7.5px; padding: 2px 3px; text-align: center; border: 1px solid #333; }
        .checklist-table td { border: 1px solid #999; padding: 2px 3px; font-size: 8px; vertical-align: middle; }
        .checklist-table .no-col { text-align: center; width: 20px; }
        .checklist-table .item-col { width: 38%; }
        .checklist-table .risk-col { text-align: center; width: 12%; }
        .checklist-table .cond-col { text-align: center; width: 8%; }
        .checklist-table .ket-col { width: 16%; }
        .risk-critical { color: #c00; font-weight: bold; }
        .risk-tinggi { color: #e65; font-weight: bold; }
        .risk-sedang { color: #a80; }
        .risk-rendah { color: #666; }
        .cond-layak { color: #070; font-weight: bold; }
        .cond-tl { color: #c00; font-weight: bold; }
        .row-critical td { background: #fff0f0; }

        .sig-img { max-width: 80px; max-height: 30px; }

        .service-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .service-table td { padding: 2px 4px; font-size: 8.5px; border: 1px solid #ccc; vertical-align: top; }

        .bbm-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .bbm-table th, .bbm-table td { border: 1px solid #999; padding: 2px 3px; font-size: 8px; text-align: center; }
        .bbm-table th { background: #ddd; }

        .kesimpulan-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .kesimpulan-table th, .kesimpulan-table td { border: 1px solid #999; padding: 3px 4px; font-size: 8.5px; text-align: center; }
        .kesimpulan-table th { background: #ddd; }
        .layak-text { color: #070; font-weight: bold; font-size: 10px; }
        .tl-text { color: #c00; font-weight: bold; font-size: 10px; }

        .catatan-box { border: 1px solid #999; padding: 4px; font-size: 8.5px; min-height: 20px; }
        .footer { text-align: center; font-size: 7px; color: #666; margin-top: 6px; }
    </style>
</head>
<body>

{{-- HEADER --}}
<table class="header-table">
    <tr>
        <td style="width:15%; text-align:center;">
            <div style="font-size:8px; font-weight:bold;">WBK</div>
            <div style="font-size:7px;">PT. Wahana Bandhawa Kencana</div>
        </td>
        <td class="title-box" style="width:70%;">
            <h2>Formulir Pemeriksaan &amp; Perawatan Harian (P2H)<br>Unit Sarana – Bus / Light Vehicle</h2>
        </td>
        <td class="doc-info" style="width:15%;">
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

{{-- INFO 4 USER --}}
<div class="section-title">Data Driver</div>
<table class="users-table">
    <thead>
        <tr>
            <th></th>
            @for($i = 1; $i <= 4; $i++)
                <th>User #{{ $i }}</th>
            @endfor
        </tr>
    </thead>
    <tbody>
        @php
            $entries = collect([1,2,3,4])->map(fn($slot) => $session->userEntries->firstWhere('user_slot', $slot));
        @endphp
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
                <td>{{ $entry?->km_awal ?? '-' }}</td>
            @endforeach
        </tr>
        <tr>
            <td class="user-label">Paraf</td>
            @foreach($entries as $entry)
                <td>
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
            <th class="item-col">Item Periksa</th>
            <th class="risk-col">Risiko</th>
            <th class="cond-col">User #1</th>
            <th class="cond-col">User #2</th>
            <th class="cond-col">User #3</th>
            <th class="cond-col">User #4</th>
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
                        $answer = $entry?->answers?->firstWhere('inspection_item_id', $item->id);
                        $kondisi = $answer?->kondisi;
                        if ($kondisi === 'Tidak Layak' && $answer->keterangan) {
                            $keterangans[] = 'U' . $entry->user_slot . ': ' . $answer->keterangan;
                        }
                    @endphp
                    <td class="cond-col">
                        @if($kondisi === 'Layak')
                            <span class="cond-layak">✓</span>
                        @elseif($kondisi === 'Tidak Layak')
                            <span class="cond-tl">✗</span>
                        @else
                            -
                        @endif
                    </td>
                @endforeach
                <td class="ket-col">{{ implode(' | ', $keterangans) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

{{-- INFORMASI SERVIS --}}
<div class="section-title">Informasi Servis</div>
@php $svc = $session->serviceInfo; @endphp
<table class="service-table">
    <tr>
        <td style="width:25%;">
            <strong>Jenis Servis:</strong><br>
            @if($svc?->servis_mingguan) ☑ Servis Mingguan<br> @else ☐ Servis Mingguan<br> @endif
            @if($svc?->servis_berkala) ☑ Servis Berkala<br> @else ☐ Servis Berkala<br> @endif
            @if($svc?->unschedule_breakdown) ☑ Unschedule Service (Break Down)<br> @else ☐ Unschedule Service (Break Down)<br> @endif
            @if($svc?->lainnya) ☑ Lainnya: {{ $svc->lainnya }} @else ☐ Lainnya @endif
        </td>
        <td>
            <strong>Catatan Servis:</strong><br>
            {{ $svc?->catatan_servis ?? '-' }}
        </td>
    </tr>
</table>

{{-- PENGISIAN BBM --}}
<div class="section-title">Pengisian Bahan Bakar</div>
<table class="bbm-table">
    <thead>
        <tr>
            <th>User</th>
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
                    <td>User #{{ $entry->user_slot }}</td>
                    <td>{{ $entry->shift ?? '-' }}</td>
                    <td>{{ $entry->fuelLog?->km_unit ?? '-' }}</td>
                    <td>{{ $entry->fuelLog?->jumlah_liter ?? '-' }}</td>
                    <td>
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
            @for($i = 1; $i <= 4; $i++)
                <th>User #{{ $i }}</th>
            @endfor
        </tr>
    </thead>
    <tbody>
        <tr>
            @foreach($entries as $entry)
                @php
                    $hasTL = $entry?->answers?->where('kondisi', 'Tidak Layak')->count() > 0;
                @endphp
                <td>
                    @if($entry === null)
                        <span style="color:#999;">-</span>
                    @elseif($hasTL)
                        <span class="tl-text">TIDAK LAYAK</span>
                    @else
                        <span class="layak-text">LAYAK</span>
                    @endif
                </td>
            @endforeach
        </tr>
    </tbody>
</table>

{{-- CATATAN KHUSUS --}}
<div class="section-title">Catatan Khusus</div>
<div class="catatan-box">{{ $session->catatan_khusus ?? '-' }}</div>

<div class="footer">
    Dicetak oleh sistem PIMS – {{ now()->format('d/m/Y H:i') }} | WBK-HSE-FO-091
</div>

</body>
</html>
