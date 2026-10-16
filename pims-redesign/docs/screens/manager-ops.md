# Layar · Operasional Manager/Admin

Semua layar: pemilih site aktif, 5 keadaan (memuat/kosong/error/offline/403), tema 3. Desktop = sidebar + PageHeader. Mobile = app bar + bottom nav.

## Dashboard (`/dashboard`)
Gambar: `Dashboard.png`, `Dashboard-Desktop.png`.
- **Header desktop**: "Dashboard" + "Pit A · Jumat, 16 Okt 2026 · Shift 1 · diperbarui 06:14" · cari global (⌘K: unit, driver, temuan) · pemilih site · pemilih "Hari ini · Shift 1" · lonceng notifikasi (badge).
- **KPI strip** (5, tanpa kartu di desktop; garis pemisah bawah): P2H masuk `42 / 48` ("87,5% · 40 Layak") · Belum P2H `6` ("batas 06:30 · 18 mnt", warning) · Tidak Layak `2` (danger; daftar kode) · Temuan open `12` ("3 lewat tenggat", danger) · PA hari ini `85,4%` ("▲ 1,2 poin vs kemarin" success).
- **Tren kepatuhan · 30 hari** (line `chart-1` + area lembut, garis target 95 putus, label rata-rata) — mobile: ketuk/geser untuk tooltip per hari; tombol "Lihat kepatuhan per unit".
- **Ketersediaan armada**: bar bertumpuk horizontal Ready/BD/PM/Servis (status warna + legenda angka) + daftar "Tidak Ready" (kode, pill, catatan). Mobile: ketuk unit → sheet "Ubah status" (segmented Ready/BD/PM/Servis, "Berlaku sejak" tanggal+jam, Keterangan, info "Perubahan tercatat sebagai periode downtime dan masuk Audit Log.", "Simpan status", toast Urungkan).
- **Status P2H hari ini**: chip Semua/Belum P2H/Tidak Layak/Menunggu setuju + Export; tabel: ☐ · Unit · Jenis · Driver · P2H (pill) · Waktu · Persetujuan ("Menunggu · 26 mnt" warning / "Eskalasi · 34 mnt" danger / "Disetujui") · Status unit · aksi kontekstual (Lihat / Tinjau → Persetujuan / Ingatkan).
- Mobile: KPI hero + ringkasan + tombol "Ingatkan semua driver" + sheet "Lainnya" (navigasi laporan, master, admin, akun).
- Admin melihat item Sampah (14) di menu Lainnya/Admin.

## Monitoring P2H (`/monitoring`)
Gambar: `Monitoring.png`, `Monitoring-Desktop.png`.
- Header: "Jumat, 16 Okt 2026 · Shift 1 (06:00–18:00 WITA) · Pit A" · indikator live "Diperbarui 12 dtk lalu" (titik hijau berdenyut; klik = muat ulang, ikon berputar) · segmented Shift 1/2. Data polling 30 dtk (atau Echo/websocket).
- **KPI = filter** (kartu tombol, `aria-pressed`): P2H masuk `42 / 48` + bar · Belum P2H (warning, hitung mundur ke batas) · Tidak layak (danger) · Menunggu persetujuan. Chip filter aktif muncul di atas tabel dengan ×.
- Tabel (12/halaman): ☐ (hanya baris Belum P2H) · Unit+tipe · Driver · Status unit · P2H pill (tooltip: "Rusak: Lampu rotary · Menunggu") · Jam · aksi: "Ingatkan" (→ "Terkirim ✓") untuk Belum P2H, "Lihat" untuk yang sudah. Urutan default: Tidak layak → Belum → Menunggu → Layak → Mulai nanti → Tidak dioperasikan. Pagination.
- Panel kanan "Aktivitas terbaru" (feed realtime: masuk, disetujui, BD otomatis) dengan titik warna status.
- Bulk: "{n} unit belum P2H · Ingatkan via WhatsApp".
- Shift 2 sebelum mulai: semua "Mulai 18:00"; feed "Shift 2 belum dimulai. Pengingat otomatis 17:45."
- Mobile: chip filter + daftar kartu + sheet detail unit.

## Kepatuhan (`/kepatuhan`)
Gambar: `Kepatuhan.png`, `Kepatuhan-Desktop.png`.
- Rentang 7/14/30 hari, Export. KPI: Kepatuhan armada (% vs target 95), Tepat waktu, Terlambat, Tidak P2H.
- **Heatmap unit × hari**: kolom hari (inisial + tanggal, hari ini tebal), sel tombol 28px: tepat waktu = `foreground`; terlambat = `brand` + ikon jam; tidak P2H = `danger-soft` + border + ikon ×; tidak wajib = arsir. Tooltip: "LV-034 · Rab, 14 Okt / Tepat waktu · submit 06:02". Kolom akhir "Patuh %" (danger < 80, warning < 95). Sort by unit atau %. Legenda.
- Mobile: heatmap scroll horizontal (otomatis ke hari ini), kolom unit sticky dengan bayangan; ketuk sel → detail di bawah.
- "Perlu perhatian": 3 driver/unit terendah — "7× tidak P2H · 5× terlambat dalam 30 hari" + "Kirim teguran ke {driver}" (WA, tercatat Audit).

## Persetujuan (`/persetujuan`)
Gambar: `Persetujuan.png`, `Persetujuan-Desktop.png`. Aturan: `08#4`.
- **Desktop master–detail** (tinggi viewport): kiri 320–400 daftar antrean (☐, kode, driver, umur "31 mnt" merah bila > 15, pill hasil, ringkas checklist, tag Eskalasi; item aktif = latar muted + garis kuning kiri); chip Semua/Eskalasi/Ada rusak. Kanan detail: judul unit+tipe, meta, pill hasil; banner eskalasi; banner Tidak Layak ("Unit sudah otomatis BD … unit tetap BD sampai temuan ditutup"); HM/BBM/Checklist; item rusak (foto 160×110 + catatan + KRITIS); **tanda tangan approver** (dipakai juga untuk massal); footer sticky "Tolak R" · "Setujui P2H A". Pintasan ↑↓ A R Spasi. Bulk bar bawah daftar: "Setujui {n}" (butuh tanda tangan). Setelah aksi, fokus pindah ke item berikutnya. Kosong: "Antrean kosong · Semua P2H sudah ditinjau."
- **Mobile**: daftar kartu dengan **swipe** (kanan setujui / kiri tolak, underlay hijau/merah), long-press untuk massal, ketuk → detail layar penuh → sheet tanda tangan "Setujui P2H". Tolak → sheet alasan (chip + teks, wajib).

## Temuan (`/temuan`)
Gambar: `Temuan.png`, `Temuan-Desktop.png`. Aturan `08#5`.
- KPI: Open (n kritis) · Lewat tenggat (danger) · Jatuh tempo hari ini · Rata-rata umur open (target ≤ 2 hari).
- Filter: cari (ID/unit/item), chip Open/Lewat tenggat/Closed/Semua, checkbox "Hanya kritis".
- Tabel: ☐ · ID (mono) · Unit · Temuan (thumbnail 40×32 + judul + KRITIS + "P2H 14 Okt · Shift 1 · Budi S.") · Tenggat (danger bila lewat, warning hari ini) · Status · Umur · PJ (avatar inisial + tooltip nama/tim) · Buka. Default sort tenggat ↑.
- Bulk: "PJ → Yanto / Wahyu / Tim Body" (notifikasi ke PJ, Urungkan).
- **Drawer detail** (540): foto besar 220px, Ditemukan/PJ/Tenggat/Catatan driver, **Saran perbaikan AI** (tombol "Buat saran" → streaming), bagian **Tutup temuan**: unggah foto setelah perbaikan (wajib) + catatan perbaikan (min 10) → "Tutup temuan" (footer) / "Nanti". Closed: banner sukses "Temuan sudah ditutup · {tanggal}".
- Mobile: daftar kartu + detail layar penuh + sheet "Tutup temuan".

## Notifikasi (`/notifikasi`)
Gambar: `Notifikasi.png`, `Notifikasi-Desktop.png`. Lihat `09`.
- Tab Semua · Belum dibaca · Butuh tindakan (hitungan). "Tandai semua dibaca" (Urungkan).
- Grup "Butuh tindakan" / "Temuan" / "Info". Baris: ikon tipe 36 (kritis/eskalasi merah, jam oranye, centang/orang netral) · tipe (caption) + titik biru belum dibaca · judul (600 bila belum dibaca) · isi · jam. Klik = tandai dibaca + buka tautan. Hover/fokus menampilkan "Tandai dibaca/belum dibaca" & "Hapus" (Urungkan). Mobile: tekan lama / menu ⋯.
- Desktop panel kanan **"Kirim ke saya lewat"**: matriks tipe × Push/WA/Email (kritis Push & WA terkunci) + info jam tenang.
