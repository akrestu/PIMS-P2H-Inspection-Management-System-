# Layar · Laporan

## Ringkasan harian (`/laporan/ringkasan`) <a id="ringkasan"></a>
Gambar: `RingkasanHarian.png`, `RingkasanHarian-Desktop.png`.
- Navigasi hari ‹ "Jumat, 16 Okt 2026" › (tidak bisa ke masa depan). Sub: "Pit A · dikirim otomatis 07:45 WITA ke 3 manager".
- 6 angka: P2H masuk (`42 / 48`, % & delta), Layak/tidak layak, Belum P2H, PA armada (% & delta, target 90), Temuan baru/ditutup (open), Lewat tenggat.
- **Perlu tindakan**: baris bertitik (danger/warning) yang menaut ke Downtime / Monitoring ("Ingatkan") / Temuan.
- **Ringkasan AI**: idle → "Buat ringkasan" → skeleton → streaming → "Buat ulang". Lihat `09`.
- **Teks untuk WhatsApp** (desktop panel kanan sticky 400): pratinjau gelembung `pre-wrap` + hitungan karakter, switch "Sertakan link rekap publik", "Salin teks" (→ "Tersalin ✓"), "Kirim ke WhatsApp" / "Buka WhatsApp Web", catatan wa.me. Format teks:
```
*Rekap P2H — Pit A*
Jumat, 16 Okt 2026 · Shift 1

*Ringkasan*
• P2H masuk: 42/48 (87,5%)
• Layak: 40 · Tidak Layak: 2
• Belum P2H: 6 (LV-034, DT-1031, WT-007, DT-1038, DT-1072, LV-040)

*Unit BD*
• DT-1050 — kebocoran oli (kritis)
• EX-2003 — rem parkir (kritis)

*Temuan*: baru 4 · ditutup 2 · open 12 (4 lewat tenggat)
*Ketersediaan*: PA 78,4%

_Prioritas: ingatkan 3 driver berulang dan dahulukan perbaikan EX-2003._

Rekap lengkap: https://pims.example/r/pta/7Kq2
```
(Baris italic hanya bila ringkasan AI sudah dibuat & toggle AI-WA aktif.)

## Laporan periode (`/laporan/periode`)
Gambar: `LaporanPeriode.png`, `LaporanPeriode-Desktop.png`.
- Rentang 7 hari / 30 hari / Bulan ini / Bulan lalu / kustom (sheet "Rentang laporan" Dari–Sampai, "Terapkan"); dibandingkan periode sebelumnya. Excel + "Unduh PDF".
- KPI: Kepatuhan rata-rata (▲ delta), P2H tercatat (dari wajib), Tidak Layak (vs periode lalu), Temuan dibuka (ditutup · open), PA rata-rata, Downtime (jam, % BD).
- Chart: **Kepatuhan harian** (line + target 95), **Temuan per minggu** (kolom berdampingan Dibuka `chart-1` / Ditutup `chart-2`), tabel **Per site** (kepatuhan dengan bar mini, P2H, Tidak Layak, PA; sortable).
- **Ringkasan AI periode** (paragraf + 3 bullet rekomendasi, "Ikut dicetak di halaman pertama PDF.") + Salin.
- PDF: kop PIMS + site + rentang, halaman 1 ringkasan AI + KPI, lalu chart & tabel.

## Analitik unit (`/laporan/analitik`)
Gambar: `AnalitikUnit.png` (tab Item rusak / Unit / Tren), `Analitik-Desktop.png`.
- **Item paling sering rusak**: bar horizontal `chart-1` (label 236px + KRITIS), nilai kanan, tooltip detail ("Terbanyak di LV (9)…"); klik item = filter tabel unit (chip "Item: Rem parkir ×").
- **Tren kerusakan mingguan**: stacked kritis (`danger`) + non-kritis (`chart-1`), total di atas, minggu berjalan diberi catatan; tooltip di samping kolom.
- **Unit dengan kerusakan terbanyak**: Unit · Kerusakan · Downtime (j) · MTTR (j) · Item utama · sparkline 4 minggu (`chart-2`) · "Riwayat" → Riwayat P2H terfilter unit. Sortable.

## Monitoring PA (`/laporan/pa`)
Gambar: `MonitoringPA.png`, `PA-Desktop.png`. Rumus `08#6`.
- Navigasi minggu ‹ "10–16 Okt 2026" ›. KPI: PA armada (target ≥ 90), Jam breakdown, Jam PM/servis, Unit di bawah target.
- **PA armada harian · 14 hari**: line `chart-1` + titik, garis target 90% putus, sumbu Y 70–100%, area hover per hari (crosshair + tooltip "Jum, 16 Okt (berjalan) · PA 78,4% · 11,6 poin di bawah target · BD 19,9 j · PM/Servis 31,9 j").
- **PA per unit**: grid unit × 7 hari, sel berisi angka PA dengan ramp kuning 5 tingkat + legenda; tooltip "Ready 24 j · BD 6,7 j"; kolom rata-rata (danger < 90), sort.
- Mobile: label "PA armada · minggu", grid yang sama dengan sel bisa diketuk.

## Downtime (`/downtime`)
Gambar: `Downtime.png`, `Downtime-Desktop.png`. Aturan `08#3, #6`.
- KPI: Unit BD sekarang (n otomatis dari P2H), PM/servis berjalan, Jam BD hari ini, Jam PM/servis hari ini.
- **Linimasa hari ini** (00:00–12:00 atau 00:00–24:00 dengan scroll): jalur per unit, batang BD (`danger`) / PM (`info`) / Servis (`warning`), garis "sekarang", batang berlangsung terbuka; hover tooltip, klik = buka drawer ubah.
- Tab **Berlangsung · n** / **Selesai hari ini · n**; tabel Unit · Status · Waktu ("05:55 – berlangsung") · Durasi · Sumber (Otomatis dari P2H / Manual) · Keterangan · "Tandai Ready" (berlangsung) · "Ubah".
- Drawer **Catat/Ubah downtime**: Unit (select), Status (segmented BD/PM/Servis), Mulai, Selesai (nonaktif bila "Masih berlangsung"), Keterangan; validasi selesai > mulai; info "Status unit di Master unit ikut berubah…"; Hapus (ubah).
- Mobile: kartu per downtime + sheet form yang sama.

## Rekap publik (`/r/{site}/{token}`)
Gambar: `RekapPublik.png` (tweak `tautan`). Tanpa login, read-only.
- Header "Rekap P2H" + "Tautan publik · hanya baca"; pilih Tanggal & Site (hanya berlaku di halaman ini); angka ringkas + daftar per unit (kode, status, hasil, tanpa nama); footer "Diperbarui 06:14 WIB… Data bersifat ringkas; detail sesi hanya untuk pengguna yang login."
- Token tidak aktif: "Tautan sudah tidak aktif" + "Admin site telah menonaktifkan atau membuat ulang tautan ini. Minta tautan terbaru di grup WhatsApp tim."
