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
        .ig .val { }

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
                   padding: 2px 4px !important; }
        .tick { font-size: 8.5px; font-weight: bold; }

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
        .sig td { width: 33.33%; vertical-align: top; padding: 3px 6px 4px 6px;
                   border-right: 1px solid #000; font-size: 7.5px; text-align: left; }
        .sig td:last-child { border-right: none; }
        .sig .role { font-weight: bold; margin-bottom: 2px; }
        .sig .space { height: 30px; position: relative; }
        .sig .sig-img { max-width: 80px; max-height: 28px; }
        .sig .nl { border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;
                    text-align: center; font-size: 7.5px; }

        /* ── FOOTER ── */
        .fnote { padding: 2px 5px; font-size: 6px; color: #444; line-height: 1.6; }

        /* ── SECTION DIVIDERS (border-top on each section wrapper) ── */
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
@endphp

@foreach($entries as $idx => $entry)

{{-- ══ OUTER FRAME via inline style ══ --}}
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
            <td class="lbl">NAMA</td><td class="sep">:</td><td class="val">{{ $entry->user?->name ?? '-' }}</td>
            <td class="lbl">JOB SITE</td><td class="sep">:</td><td class="val" colspan="4">{{ $session->job_site ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">HARI/TGL</td><td class="sep">:</td><td class="val">{{ $session->tanggal->translatedFormat('l, d/m/Y') }}</td>
            <td class="lbl">TYPE ALAT</td><td class="sep">:</td><td class="val" colspan="4">{{ $session->unit->jenis_unit ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">SHIFT</td><td class="sep">:</td><td class="val">{{ $entry->shift ?? '-' }}</td>
            <td class="lbl">NO ALAT</td><td class="sep">:</td><td class="val" colspan="4">{{ $session->unit->no_unit ?? '-' }}</td>
        </tr>
        <tr>
            <td class="lbl">LOKASI KERJA</td><td class="sep">:</td><td class="val">{{ $entry->lokasi_kerja ?? '-' }}</td>
            <td class="lbl">HM/KM AWAL</td><td class="sep">:</td><td class="val">{{ $entry->km_awal !== null ? number_format($entry->km_awal, 0, ',', '.') : '' }}</td>
            <td class="lbl">HM/KM AKHIR</td><td class="sep">:</td><td class="val">{{ $entry->hm_km_akhir !== null ? number_format($entry->hm_km_akhir, 0, ',', '.') : '' }}</td>
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
                    <td class="cn0" style="font-weight:bold;">{{ $sectionKey }}</td>
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

    {{-- CATATAN --}}
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

    {{-- PELAKSANA LABEL --}}
    <div class="div2" style="padding:2px 5px; font-size:7.5px; font-weight:bold;">
        Pelaksana Pemeriksaan Harian:
    </div>

    {{-- TANDA TANGAN --}}
    <div class="div2">
    <table class="sig">
        <tr>
            <td>
                <div class="role">Dibuat oleh :</div>
                <div class="space">
                    @if($entry->paraf_url)
                        <img src="{{ storage_path('app/public/' . $entry->paraf_url) }}" class="sig-img" alt="paraf">
                    @endif
                </div>
                <div class="nl">( {{ $entry->user?->name ?? '...............................' }} )<br><strong>Driver</strong></div>
            </td>
            <td>
                <div class="role">Diperiksa oleh :</div>
                <div class="space"></div>
                <div class="nl">( ...............................<br><strong>Mekanik</strong></div>
            </td>
            <td>
                <div class="role">Diketahui.</div>
                <div class="space"></div>
                <div class="nl">( ...............................<br><strong>Supervisor</strong></div>
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
</table>{{-- /outer frame --}}

@if(!$loop->last)
    <div class="page-break"></div>
@endif

@endforeach
</body>
</html>
