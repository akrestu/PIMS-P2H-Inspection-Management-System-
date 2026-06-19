<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>P2H {{ $session->unit->no_unit }} - {{ $session->tanggal->format('d/m/Y') }}</title>
    <style>
        @page { size: A4 portrait; margin: 12mm 12mm 10mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 8px; color: #000; background: #fff; line-height: 1.2; }

        .page-break { page-break-after: always; }

        /* ── HEADER ── */
        .hdr { width: 100%; border-collapse: collapse; }
        .hdr .logo { width: 105px; padding: 5px 6px; border-right: 1px solid #000; vertical-align: middle; }
        .hdr .logo .cn { font-size: 8.5px; font-weight: bold; line-height: 1.4; }
        .hdr .logo .cs { font-size: 6px; color: #333; margin-top: 1px; }
        .hdr .ttl { text-align: center; padding: 4px 8px; vertical-align: middle; }
        .hdr .ttl h2 { font-size: 9.5px; font-weight: bold; text-transform: uppercase; line-height: 1.6; }
        .hdr .di { width: 120px; border-left: 1px solid #000; vertical-align: top; }
        .hdr .di table { width: 100%; border-collapse: collapse; }
        .hdr .di table td { padding: 2px 4px; font-size: 7px; border-bottom: 1px solid #000; }
        .hdr .di table tr:last-child td { border-bottom: none; }
        .hdr .di table td:first-child { font-weight: bold; white-space: nowrap; border-right: 1px solid #000; }

        /* ── INFO GRID ── */
        .ig { width: 100%; border-collapse: collapse; }
        .ig td { border-right: 1px solid #000; border-bottom: 1px solid #000;
                  padding: 2px 4px; font-size: 8px; height: 13px; vertical-align: middle; }
        .ig td:last-child { border-right: none; }
        .ig tr:last-child td { border-bottom: none; }
        .ig .lbl { font-weight: bold; width: 78px; white-space: nowrap; }
        .ig .sep { width: 9px; text-align: center; }

        /* ── INSTR ── */
        .instr { font-size: 7.5px; font-style: italic; padding: 2px 4px; line-height: 1.55; }

        /* ── CHECKLIST ── */
        .cl { width: 100%; border-collapse: collapse; }
        .cl th { border-right: 1px solid #000; border-bottom: 1px solid #000;
                  padding: 2px 2px; font-size: 7.5px; font-weight: bold;
                  text-align: center; vertical-align: middle; line-height: 1.3; }
        .cl th:last-child { border-right: none; }
        .cl td { border-right: 1px solid #000; border-bottom: 1px solid #000;
                  padding: 1px 3px; font-size: 7.5px; vertical-align: middle; }
        .cl td:last-child { border-right: none; }
        .cl tbody tr:last-child td { border-bottom: none; }

        .cn0  { width: 18px; text-align: center; }
        .ctsk { text-align: left; padding-left: 4px !important; }
        .ckd  { width: 42px; text-align: center; }
        .cnm  { width: 42px; text-align: center; }
        .cabn { width: 42px; text-align: center; }
        .cket { width: 110px; }

        .sec td { font-weight: bold; font-size: 7.5px; text-transform: uppercase;
                   padding: 2px 4px !important; background: #f0f0f0; }
        .tick { font-size: 8.5px; font-weight: bold; }

        /* ── KONDISI AKHIR ── */
        .kondisi-box { padding: 3px 5px; font-size: 8px; }
        .kondisi-badge { display: inline-block; padding: 1px 6px; border-radius: 3px;
                          font-weight: bold; font-size: 7.5px; border: 1px solid; }
        .kondisi-layak { background: #dcfce7; color: #166534; border-color: #86efac; }
        .kondisi-bd    { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .kondisi-override { display: inline-block; margin-left: 4px; padding: 1px 5px;
                             border-radius: 3px; background: #fef9c3; color: #854d0e;
                             border: 1px solid #fde047; font-size: 7px; }

        /* ── FUEL LOG ── */
        .fuel-box { padding: 3px 5px; font-size: 8px; }
        .fuel-grid { width: 100%; border-collapse: collapse; }
        .fuel-grid td { padding: 1px 4px; font-size: 8px; }

        /* ── SERVICE INFO ── */
        .svc-box { padding: 3px 5px; font-size: 8px; }
        .svc-check { display: inline-block; width: 8px; height: 8px; border: 1px solid #000;
                      text-align: center; line-height: 8px; font-size: 7px; margin-right: 2px;
                      vertical-align: middle; }

        /* ── APPROVAL ── */
        .apv-box { padding: 3px 5px; font-size: 8px; }
        .apv-approved { color: #166534; font-weight: bold; }
        .apv-rejected { color: #991b1b; font-weight: bold; }
        .apv-pending  { color: #92400e; font-weight: bold; }

        /* ── CATATAN ── */
        .cat-title { font-weight: bold; font-size: 8px; text-align: center;
                      padding: 2px; border-bottom: 1px solid #000; }
        .cat-body { width: 100%; border-collapse: collapse; }
        .cat-body td { height: 10px; border-bottom: 1px solid #ddd;
                         padding: 1px 4px; font-size: 8px; }
        .cat-body tr:last-child td { border-bottom: none; }

        /* ── PENTING ── */
        .penting { padding: 3px 5px; font-size: 7px; line-height: 1.65; }

        /* ── SIG ── */
        .sig { width: 100%; border-collapse: collapse; }
        .sig td { vertical-align: top; padding: 3px 6px 4px 6px;
                   border-right: 1px solid #000; font-size: 7.5px; text-align: left; }
        .sig td:last-child { border-right: none; }
        .sig .role { font-weight: bold; margin-bottom: 2px; }
        .sig .space { height: 32px; position: relative; }
        .sig .sig-img { max-width: 80px; max-height: 30px; object-fit: contain; }
        .sig .nl { border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;
                    text-align: center; font-size: 7.5px; }

        /* ── FOOTER ── */
        .fnote { padding: 2px 5px; font-size: 6px; color: #444; line-height: 1.6; }

        /* ── SECTION DIVIDERS ── */
        .div1 { border-top: 1.5px solid #000; }
        .div2 { border-top: 1px solid #000; }
    </style>
</head>
<body>

@php
    $entries  = $session->userEntries;
    $sections = [
        'A' => 'PEMERIKSAAN KELILING UNIT / DI LUAR KABIN',
        'B' => 'PEMERIKSAAN DARI DALAM KABIN',
        'C' => 'KELENGKAPAN TAMBAHAN',
    ];
    $svcInfo = $session->serviceInfo;
@endphp

@foreach($entries as $idx => $entry)

@php
    $fuelLog     = $entry->fuelLog;
    $hasFuel     = $fuelLog && ($fuelLog->km_unit || $fuelLog->jumlah_liter);
    $kondisiAkhr = $entry->kondisi_akhir;
    $isOverride  = (bool) $entry->is_override;
    $approvalSts = $entry->approval_status; // null | 'pending' | 'approved' | 'rejected'
    $approver    = $entry->approver;

    $isLV     = $session->unit?->jenis_unit === 'Light Vehicle';
    $showApvr = $isLV && $approvalSts !== null;
@endphp

<table style="width:100%; border-collapse:separate; border-spacing:0; border:2px solid #000;">
<tr><td style="padding:0;">

    {{-- HEADER --}}
    <table class="hdr">
        <tr>
            <td class="logo">
                <div class="cn">WAHANA BANDHAWA KENCANA</div>
                <div class="cs">EARTHMOVING AND MINING COMPANY</div>
            </td>
            <td class="ttl">
                <h2>PELAKSANAAN PEMERIKSAAN HARIAN ( P2H ) - PRESTART CEK DRIVER<br>LV - ELF - BUS<br>PERNYATAAN DRIVER</h2>
            </td>
            <td class="di">
                <table>
                    <tr><td>NO</td><td>WBK-PRO-FO-056</td></tr>
                    <tr><td>TANGGAL TERBIT</td><td>1/12/2018</td></tr>
                    <tr><td>NO REVISI</td><td>001</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- DIVIDER --}}
    <div class="div1"></div>

    {{-- INFO GRID --}}
    <table class="ig">
        <colgroup>
            <col style="width:78px"><col style="width:9px"><col>
            <col style="width:72px"><col style="width:9px"><col>
            <col style="width:72px"><col style="width:9px"><col style="width:62px">
        </colgroup>
        <tr>
            <td class="lbl">NAMA</td><td class="sep">:</td><td>{{ $entry->user?->name ?? '-' }}</td>
            <td class="lbl">JOB SITE</td><td class="sep">:</td><td colspan="4">{{ $session->job_site ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">HARI/TGL</td><td class="sep">:</td><td>{{ $session->tanggal->translatedFormat('l, d/m/Y') }}</td>
            <td class="lbl">TYPE ALAT</td><td class="sep">:</td><td colspan="4">{{ $session->unit->jenis_unit ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">SHIFT</td><td class="sep">:</td><td>{{ $entry->shift ?? '-' }}</td>
            <td class="lbl">NO ALAT</td><td class="sep">:</td><td colspan="4">{{ $session->unit->no_unit ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">LOKASI KERJA</td><td class="sep">:</td><td>{{ $entry->lokasi_kerja ?? '-' }}</td>
            <td class="lbl">HM/KM AWAL</td><td class="sep">:</td><td>{{ $entry->km_awal !== null ? number_format($entry->km_awal, 0, ',', '.') : '-' }}</td>
            <td class="lbl">HM/KM AKHIR</td><td class="sep">:</td><td>{{ $entry->hm_km_akhir !== null ? number_format($entry->hm_km_akhir, 0, ',', '.') : '-' }}</td>
        </tr>
    </table>

    {{-- INSTRUKSI --}}
    <div class="div2">
        <div class="instr">
            Beri tanda dalam kotak checkpoint dengan "V" pada kolom kondisi normal / abnormal<br>
            Tuliskan pada kolom "Keterangan" apabila terdapat kondisi abnormal
        </div>
    </div>

    {{-- CHECKLIST --}}
    <div class="div2">
    <table class="cl">
        <thead>
            <tr>
                <th class="cn0" rowspan="2">NO</th>
                <th class="ctsk" rowspan="2" style="text-align:left; padding-left:4px;">TUGAS - TUGAS PEMERIKSAAN</th>
                <th class="ckd" rowspan="2">KODE<br>BAHAYA</th>
                <th colspan="2">KONDISI</th>
                <th class="cket" rowspan="2">KETERANGAN /<br>PENJELASAN</th>
            </tr>
            <tr>
                <th class="cnm">NORMAL</th>
                <th class="cabn">ABNORMAL</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sections as $sectionKey => $sectionLabel)
                <tr class="sec">
                    <td class="cn0">{{ $sectionKey }}</td>
                    <td colspan="5">{{ $sectionLabel }}</td>
                </tr>
                @foreach($inspectionItems->where('section', $sectionKey) as $item)
                    @php
                        $answer   = $entry?->answers?->firstWhere('inspection_item_id', $item->id);
                        $kondisi  = $answer?->kondisi;
                        $isNormal = $kondisi === 'Layak';
                        $isAbnorm = $kondisi === 'Tidak Layak';
                        $ket      = ($isAbnorm && $answer?->keterangan) ? $answer->keterangan : '';
                    @endphp
                    <tr>
                        <td class="cn0">{{ $loop->iteration }}</td>
                        <td class="ctsk">{{ $item->nama_item }}</td>
                        <td class="ckd" style="text-align:center; font-weight:bold;">{{ $item->kode_bahaya }}</td>
                        <td class="cnm"><span class="tick">{{ $isNormal ? 'V' : '' }}</span></td>
                        <td class="cabn"><span class="tick">{{ $isAbnorm ? 'V' : '' }}</span></td>
                        <td class="cket">{{ $ket }}</td>
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>
    </div>

    {{-- KONDISI AKHIR OPERATOR --}}
    @if($kondisiAkhr)
    <div class="div2">
        <div class="kondisi-box">
            <strong>Keputusan Akhir Operator:</strong>&nbsp;
            @if($kondisiAkhr === 'Layak Pakai')
                <span class="kondisi-badge kondisi-layak">&#10003; LAYAK PAKAI</span>
            @else
                <span class="kondisi-badge kondisi-bd">&#10007; BD / TIDAK LAYAK</span>
            @endif
            @if($isOverride)
                <span class="kondisi-override">Override</span>
            @endif
            @if($entry->justifikasi_kondisi)
                <br><span style="font-style:italic; color:#555;">Alasan: {{ $entry->justifikasi_kondisi }}</span>
            @endif
        </div>
    </div>
    @endif

    {{-- PENGISIAN BAHAN BAKAR --}}
    @if($hasFuel)
    <div class="div2">
        <div class="fuel-box">
            <strong>Pengisian Bahan Bakar:</strong>
            <table class="fuel-grid" style="margin-top:2px;">
                <tr>
                    <td style="width:120px;"><strong>KM Saat Pengisian</strong></td>
                    <td style="width:8px;">:</td>
                    <td>{{ $fuelLog->km_unit !== null ? number_format($fuelLog->km_unit, 0, ',', '.') . ' km' : '-' }}</td>
                    <td style="width:100px; padding-left:12px;"><strong>Jumlah Liter</strong></td>
                    <td style="width:8px;">:</td>
                    <td>{{ $fuelLog->jumlah_liter !== null ? $fuelLog->jumlah_liter . ' liter' : '-' }}</td>
                </tr>
            </table>
        </div>
    </div>
    @endif

    {{-- SERVIS & PEMELIHARAAN (dari session, tampil hanya di entry pertama) --}}
    @if($idx === 0 && $svcInfo)
    @php
        $anySvc = $svcInfo->servis_mingguan || $svcInfo->servis_berkala || $svcInfo->unschedule_breakdown || $svcInfo->lainnya;
    @endphp
    @if($anySvc || $svcInfo->catatan_servis)
    <div class="div2">
        <div class="svc-box">
            <strong>Servis &amp; Pemeliharaan:</strong>
            @if($anySvc)
            <span style="margin-left:6px;">
                @if($svcInfo->servis_mingguan)
                    <span class="svc-check">V</span> Servis Mingguan &nbsp;
                @endif
                @if($svcInfo->servis_berkala)
                    <span class="svc-check">V</span> Servis Berkala &nbsp;
                @endif
                @if($svcInfo->unschedule_breakdown)
                    <span class="svc-check">V</span> Unschedule / Breakdown &nbsp;
                @endif
                @if($svcInfo->lainnya)
                    <span class="svc-check">V</span> Lainnya: {{ $svcInfo->lainnya }}
                @endif
            </span>
            @endif
            @if($svcInfo->catatan_servis)
                <br><span style="font-style:italic; color:#555;">Catatan Servis: {{ $svcInfo->catatan_servis }}</span>
            @endif
        </div>
    </div>
    @endif
    @endif

    {{-- STATUS VERIFIKASI (untuk LV yang memerlukan approval) --}}
    @if($showApvr)
    <div class="div2">
        <div class="apv-box">
            <strong>Status Verifikasi:</strong>&nbsp;
            @if($approvalSts === 'approved')
                <span class="apv-approved">&#10003; DISETUJUI</span>
                @if($approver)
                    &nbsp;&mdash; oleh {{ $approver->name }}
                    @if($entry->approved_at)
                        &nbsp;({{ $entry->approved_at->format('d/m/Y H:i') }})
                    @endif
                @endif
                @if($entry->catatan_approval)
                    <br><span style="font-style:italic; color:#555;">Catatan: {{ $entry->catatan_approval }}</span>
                @endif
            @elseif($approvalSts === 'rejected')
                <span class="apv-rejected">&#10007; DITOLAK</span>
                @if($approver)
                    &nbsp;&mdash; oleh {{ $approver->name }}
                @endif
                @if($entry->catatan_approval)
                    <br><span style="font-style:italic; color:#555;">Catatan: {{ $entry->catatan_approval }}</span>
                @endif
            @else
                <span class="apv-pending">&#9203; MENUNGGU VERIFIKASI</span>
                @if($entry->pic)
                    &nbsp;&mdash; PIC: {{ $entry->pic->name }}
                @endif
            @endif
        </div>
    </div>
    @endif

    {{-- CATATAN KHUSUS --}}
    <div class="div2">
        <div class="cat-title">CATATAN</div>
        @php $catatanText = trim($session->catatan_khusus ?? ''); @endphp
        <table class="cat-body">
            @if($catatanText)
                <tr><td style="height:auto; padding:2px 5px;">{{ $catatanText }}</td></tr>
                <tr><td></td></tr><tr><td></td></tr>
            @else
                <tr><td></td></tr><tr><td></td></tr><tr><td></td></tr>
            @endif
        </table>
    </div>

    {{-- PENTING --}}
    <div class="div2">
        <div class="penting">
            <strong>Penting:</strong><br>
            - Kode Bahaya AA : Stop (Tidak boleh dioperasikan)<br>
            - Kode Bahaya A &nbsp;&nbsp;: Boleh dioperasikan sambil menunggu perbaikan<br>
            - Apabila ada temuan bertanda (*) boleh dioperasikan sambil menunggu dilengkapi<br>
            - Apabila ada temuan kode bahaya "A" harus dilakukan verifikasi dan validasi oleh mekanik<br>
            - Pastikan unit posisi aman dan rata (rem parkir aktif)
        </div>
    </div>

    {{-- PELAKSANA --}}
    <div class="div2" style="padding:2px 5px; font-size:7.5px; font-weight:bold;">
        Pelaksana Pemeriksaan Harian:
    </div>

    {{-- TANDA TANGAN --}}
    <div class="div2">
    <table class="sig">
        <tr>
            {{-- Dibuat oleh: Driver --}}
            <td style="width:50%">
                <div class="role">Dibuat oleh :</div>
                <div class="space">
                    @if($entry->paraf_url)
                        <img src="{{ storage_path('app/public/' . $entry->paraf_url) }}" class="sig-img" alt="paraf driver">
                    @endif
                </div>
                <div class="nl">
                    ( {{ $entry->user?->name ?? '...............................' }} )<br>
                    <strong>Driver</strong>
                </div>
            </td>

            {{-- Diverifikasi oleh: Approver --}}
            <td style="width:50%">
                <div class="role">Diverifikasi oleh :</div>
                <div class="space">
                    @if($showApvr && $entry->approver_signature_url)
                        <img src="{{ storage_path('app/public/' . $entry->approver_signature_url) }}" class="sig-img" alt="paraf approver">
                    @endif
                </div>
                <div class="nl">
                    ( {{ $showApvr && $approver ? $approver->name : '...............................' }} )<br>
                    <strong>PIC / Atasan</strong>
                </div>
            </td>
        </tr>
    </table>
    </div>

    {{-- FOOTER --}}
    <div class="div2">
        <div class="fnote">
            * Formulir ini berfungsi sebagai laporan pemeriksaan unit &amp; sebagai bukti komunikasi masalah yang ditemukan saya. &nbsp;
            * Formulir digunakan oleh operator atau driver pada setiap unit yang digunakan serta diserahkan pada unit saat P2H / Operasi. &nbsp;
            * Simpan, Pelihara, Dikembalikan ke perusahaan. Karena dokumen ini Wajib Dipersyaratkan.
        </div>
    </div>

</td></tr>
</table>

@if(!$loop->last)
    <div class="page-break"></div>
@endif

@endforeach
</body>
</html>
