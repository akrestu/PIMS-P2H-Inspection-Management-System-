# Layar · Driver (mobile-only)

## Beranda Driver (`/beranda`)
Gambar: `BerandaDriver.png` · Prototype `BerandaDriver.dc.html` (tweak `keadaan`: Normal, Memuat, Sudah P2H, Kosong, Offline). Juga versi gelap & kontras.

Struktur (atas → bawah):
1. Header: "Jumat, 16 Okt · Shift 1" (caption) + "Halo, Budi" (title) + avatar → Akun.
2. Banner offline (bila offline): "Anda sedang offline" + "Data terakhir 06:02. P2H tetap bisa diisi dan dikirim otomatis saat sinyal kembali."
3. **Kartu "Unit hari ini"** (fokus utama): StatusPill unit (Ready) · kode besar `DT-1045` · "Dump Truck 90 t · Pit A" · HM terakhir `12.480,5` · Shift 1 `06:00–18:00`.
   - Belum P2H: `ShiftDeadline` "Belum P2H · batas 06:30 · 18 mnt lagi" (warning; danger bila lewat) + CTA **brand** xl "Isi P2H sekarang" → `/p2h/baru?unit=DT-1045`.
   - Sudah P2H: centang + "P2H terkirim · Layak Pakai" + "05:48 · 18 dari 18 item Baik" + `ApprovalTimeline` mini "Menunggu persetujuan · Pengawas · Hendra W.".
   - Kosong (tidak ditugaskan): "Belum ada unit untuk Anda" + "Pengawas belum menugaskan unit untuk Shift 1. Anda tetap bisa mengisi P2H dengan memilih unit sendiri." + "Isi P2H & pilih unit".
4. Statistik singkat: Kepatuhan 30 hari (%), Temuan aktif (n · "1 lewat tenggat").
5. "Temuan DT-1045" list (maks 3, KritisTag) + "Lihat semua".
6. "Riwayat P2H" 5 terakhir + "Semua".
7. Bottom nav driver (tengah: Isi P2H).
- **Pull-to-refresh** (≥ 64px). Memuat: skeleton kartu + list.
- Antrean offline: chip "2 P2H menunggu dikirim" yang membuka detail antrean.

## Form P2H (`/p2h/baru`)
Gambar: `FormP2H.png` · Prototype `FormP2H.dc.html` (tweak `mulai` untuk tiap langkah, `offline`). Aturan: `08-business-rules.md#2`.

Kerangka: app bar (× keluar dengan konfirmasi bila ada isian, judul "Form P2H · DT-1045", "Langkah n dari 6") + `ChecklistProgress` + konten + **footer sticky** (Kembali outline · Lanjut primary xl). Draft autosave → caption "Draft tersimpan otomatis · 06:04". Offline → banner "Offline. Draft aman di perangkat, dikirim otomatis saat online."

1. **Pilih unit**: segmented Shift (1/2, default shift berjalan) · cari unit · daftar unit (Ditugaskan di atas, badge "Ditugaskan"); unit terkunci abu + "Sudah P2H 05:48 · Budi S." + opsi "Ambil alih (ganti driver)"; unit PM/Servis nonaktif + alasan. Catatan bawah: "Unit yang sudah di-P2H pada shift ini terkunci. Satu unit, satu P2H per shift."
2. **Checklist** per kategori (Keselamatan, Mesin & cairan, Lampu & kelistrikan, Ban, kabin & komunikasi): baris item = nama (body-lg) + hint (caption) + KritisTag bila kritis + `SegmentedChoice` Baik/Rusak. Rusak → expand: textarea "Catatan kerusakan" (wajib) + tombol foto (wajib utk kritis). Item kritis rusak → banner merah "Item kritis rusak: hasil P2H menjadi Tidak Layak dan unit otomatis BD." Auto-scroll ke item berikutnya. Progres "12/18 item". Lanjut dengan item kosong → scroll ke item pertama + error.
3. **HM & BBM** ("Hour meter & odometer"): HM awal (decimal, koma), KM awal, HM akhir (nonaktif, "Akhir shift"), Level tangki (segmented Kosong/¼/½/¾/Penuh), switch "Isi BBM sebelum operasi" → "Jumlah isi … liter" ("Catat liter dari fuel truck"), info PM "PM 500 jam di HM 12.500", pertanyaan "Ada servis / perbaikan sejak P2H terakhir?" Ya/Tidak (+catatan).
4. **Foto lampiran**: "2 foto wajib. Foto dikompres ± 300 KB agar tetap terkirim di sinyal lemah." Slot "Unit tampak depan" & "Panel HM" (`PhotoCapture`, state antre/progres/gagal "Coba lagi"). Foto HM menampilkan pembacaan HM sebagai label.
5. **Review**: kartu "Perkiraan hasil" (Layak Pakai hijau / Tidak Layak merah + item penyebab), ringkasan per langkah dengan tautan "Ubah".
6. **Tanda tangan**: `SignaturePad` ("Tanda tangan driver · Budi Santoso · NRP 20231045"), "Ulangi", "Layar penuh"; checkbox pernyataan (wajib); "Diteruskan ke Hendra Wijaya" + "Eskalasi ke semua Manager site bila belum disetujui dalam 15 menit." Tombol "Kirim P2H" (brand xl).
7. **Sukses**: animasi pop + centang; Layak: "P2H terkirim · Layak Pakai"; Tidak Layak: "P2H terkirim · Tidak Layak" + "DT-1045 otomatis BD. Pengawas sudah diberi tahu." + daftar temuan. Tombol "Kembali ke Beranda". Offline: "Antre, unggah saat online".

## Riwayat P2H (`/riwayat`)
Gambar: `RiwayatP2H.png`, `RiwayatP2H-Desktop.png` · Prototype dengan tweak `peran` (Driver/Manager/Admin).
- **Mobile**: app bar "Riwayat P2H" + chip filter (Semua, Layak, Tidak layak, Belum disetujui) + toggle rentang (7/30/90 hari) + tombol Export (sheet pilihan PDF/Excel). Daftar dikelompokkan per hari ("Hari ini", "Kemarin", "14 Okt"), kartu: unit · tipe · shift · jam · driver(s) · pill hasil · status persetujuan.
- **Detail sesi** (mobile halaman, desktop drawer 520): header unit + tanggal + shift + pill hasil; bila > 1 entry: "Unit ini diisi oleh 2 driver dalam satu shift (pergantian driver). Setiap entry disetujui terpisah." Per entry (expand): avatar + driver + "Entry n · submit 05:48" + status persetujuan; HM/BBM/Checklist; item rusak (foto 72×56, catatan, KRITIS); tanda tangan driver + waktu + GPS; riwayat persetujuan. Footer: Admin "Hapus seluruh sesi" (kiri, merah) · "Unduh PDF sesi" (kanan).
- **Admin**: "Hapus entry" per entry & "Hapus seluruh sesi" → `ReasonDialog` (min 10 karakter) → Sampah + toast Urungkan.
- **Desktop**: PageHeader (sub "14 sesi · 7 hari terakhir · Pit A") + rentang + Export; cari + chip; DataTable kolom: ☐ · Tanggal (· jam) · Unit (+tipe) · Shift · Driver (+n tooltip "Andi Pratama · 05:52 → Sari Maharani · 06:05") · Checklist ("1 rusak"/"Semua baik") · HM akhir (kanan) · Hasil · Persetujuan · Detail. Bulk: Export PDF / Export Excel. Footer: "Satu sesi = satu unit per shift; pergantian driver tercatat sebagai entry terpisah."
- Driver hanya melihat entry miliknya/unitnya, tanpa aksi hapus.
