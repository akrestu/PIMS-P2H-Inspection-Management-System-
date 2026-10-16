# 02 · Komponen

Referensi visual: `design/screens/Komponen.png`, prototype `design/prototypes/Komponen.dc.html`.
Letakkan di `resources/js/components/` (shadcn di `components/ui/`, komponen PIMS di `components/pims/`). Semua komponen menerima `className` dan meneruskan `ref` bila elemen interaktif.

## Pemetaan ke shadcn/ui

| Kebutuhan | shadcn / lib | Kustomisasi |
|---|---|---|
| Tombol | `Button` | varian & ukuran di bawah |
| Bottom sheet (mobile) | `Drawer` (vaul) | snap 50%/92%, handle 40×5, radius atas 20 |
| Drawer samping (desktop) | `Sheet side="right"` | lebar 460–540, header 64 + footer aksi sticky |
| Dialog konfirmasi | `AlertDialog` | destruktif: tombol merah, input "HAPUS" |
| Toast | `sonner` | gelap (#0A0A0A), aksi "Urungkan" kuning, 5 dtk bila ada undo, 2,6 dtk lainnya |
| Segmented | `ToggleGroup type="single"` | thumb putih bergeser 150ms di track `muted` |
| Switch | `Switch` | on = `success` |
| Badge/pill | `Badge` | lihat `StatusPill` |
| Tabel | `Table` + TanStack Table | sort, select, sticky header, pagination |
| Tooltip | `Tooltip` | gelap, 12px, delay 300ms; juga muncul saat fokus keyboard |
| Select | `Select` (desktop), native `<select>` di mobile form | |
| Checkbox | `Checkbox` | accent ink |
| Input OTP | `InputOTP` | 6 digit |
| Skeleton | `Skeleton` | shimmer 1.2s, tampil hanya bila memuat > 300ms |
| Tabs | `Tabs` | gaya segmented (track muted) |
| Chart | Recharts | lihat `ChartCard` |

## Button
`<Button variant="brand|default|outline|ghost|destructive|link" size="xl|lg|default|sm|icon">`

| size | Tinggi | Radius | Pakai |
|---|---|---|---|
| xl | 56 | 12 | CTA sticky mobile ("Isi P2H sekarang", "Kirim P2H") |
| lg | 52 | 12 | tombol sheet mobile |
| default | 48 / 40 di `lg:` | 12 / 10 | umum |
| sm | 32–36 | 8 | aksi baris tabel |
| icon | 48 (mobile), 40 (desktop) | 12/10 | ikon saja, wajib `aria-label` |

- `brand`: bg kuning, teks hitam. **Maksimal satu per layar.**
- `default`: bg `primary` (ink di light, kuning di dark).
- State: hover (desktop), pressed (scale .97), focus (outline 2 + ring 5 kuning), disabled (`aria-disabled`, opacity .4, tetap fokusable bila perlu menjelaskan alasan via tooltip), loading (spinner 16 + label tetap).
- Tombol yang belum valid (mis. "Setujui" tanpa tanda tangan) **tetap bisa diklik** lalu menampilkan error di tempat — jangan diam-diam disabled.

## StatusPill
`<StatusPill status="ready|bd|pm|servis|layak|tidak-layak|menunggu|eskalasi|disetujui|ditolak|open|closed|belum|terlambat" size="sm|md" solid?>`
Peta status → token di `01-design-tokens.md`. Selalu ada titik 6px atau ikon, dan teks.

## KritisTag
Merah solid, huruf besar "KRITIS". Di Form P2H boleh disertai ikon segitiga.

## AppShell
- **Mobile** (`< lg`): `AppBar` (blur, 64–72, judul + subjudul + aksi kanan) + konten + `BottomNav`.
  - Driver: Beranda · Riwayat · **Isi P2H** (tombol tengah kuning 56) · Notifikasi · Akun.
  - Manager/Admin: Beranda · Monitoring · Temuan · Persetujuan (badge) · Lainnya (sheet berisi laporan, analitik, downtime, master data, audit, pengaturan, akun).
  - Indikator aktif: garis kuning 24×3 di atas ikon + label 600.
- **Tablet** (`md`): nav rail 72.
- **Desktop** (`lg+`): `Sidebar` 264 sticky tinggi 100vh (lihat `design/screens/Sidebar.png`):
  logo + "PIMS" → pemilih site → grup: (tanpa judul) Dashboard, Monitoring P2H, Kepatuhan, Riwayat P2H, Persetujuan [badge merah], Temuan [hitungan abu], Notifikasi [hitungan abu] · **Laporan**: Ringkasan harian, Laporan periode, Analitik unit, Monitoring PA, Downtime · **Data master**: Unit, Site, Pengguna & driver · **Admin** (Admin saja): Audit log, Pengaturan · kartu akun di bawah (avatar inisial, nama, peran) → Akun.
  Item 38–40px, aktif = `sidebar-accent` + garis kuning 3×20 di tepi kiri + `aria-current="page"`. Badge merah hanya bila butuh tindakan; lainnya angka abu.

## PageHeader (desktop)
Judul 28/600 + subjudul 14 muted (konteks: jumlah, rentang, site) + aksi kanan (segmented rentang, Export outline, CTA primer). Tinggi aksi 40.

## KpiCard / KpiStrip
Desktop: grid 4 kolom, kartu border 1 radius 14 p-16: label 13 muted · angka 28/600 `tnum` · sub 12 muted. Warna angka hanya `foreground`, `danger` (masalah), `warning` (perhatian). Opsional bar progres 4px. Bila kartu bisa diklik sebagai filter → `button` dengan `aria-pressed`, border `foreground` saat aktif.
Mobile: KPI tanpa kartu (label 13, angka 36–40), count-up 800ms sekali per sesi.

## FilterChips
Chip 34 (desktop) / 40 (mobile), radius full. Aktif = bg `primary`. Boleh menampilkan hitungan (opacity .7). Satu baris di atas data; chip aktif di mobile punya tombol hapus 32.

## DataTable (desktop)
- Container border 1 radius 14 `overflow-x-auto`; `min-width` tabel 900–1000.
- Header `muted-2` 44px, label 12/600. Kolom sortable = tombol dengan panah ↑/↓ (aktif) atau ↕ (opacity .35), `aria-sort`.
- Baris 52–60px, border-top. Baris terpilih `brand-soft`. Baris nonaktif opacity .6.
- Checkbox kolom pertama + "pilih semua" di header (hanya baris yang boleh dipilih).
- Aksi baris kanan: tombol `sm` outline ("Detail", "Ubah", "Buka").
- **BulkBar**: muncul saat ≥ 1 dipilih — bar gelap mengambang `sticky bottom-4` di tengah: "N dipilih" + aksi (tombol `rgba(255,255,255,.1)`, aksi destruktif teks merah muda, primer kuning) + tombol ×.
- Pagination: "1–12 dari 50 unit" + tombol ‹ 1 2 3 › (32px).
- Tooltip hover/fokus untuk info tambahan (driver kedua, detail rusak, PJ, approver).

## ListCard (mobile)
Kartu radius 14–16, min tinggi 72–88, border `border`, latar `card`. Ketuk = buka detail. **Long-press 450ms** = masuk mode pilih (haptic 15ms) → checkbox muncul, app bar berganti "N dipilih" + "Pilih semua", bulk bar di bawah. **Swipe** (Persetujuan): kanan = setujui (hijau), kiri = tolak (merah); ambang 96px atau kecepatan > 500px/s.

## SideDrawer (desktop) / BottomSheet (mobile)
Header (judul 18/600 + tombol tutup 40) · body scroll · footer aksi sticky (Batal outline + aksi primer kanan; aksi destruktif di kiri). Scrim `--scrim`. Esc/klik scrim menutup (kecuali ada perubahan belum disimpan → konfirmasi).

## FormField
Label 13–14/500 di atas · input 44 (desktop) / 52 (mobile), radius 10, border `input`, font 15/16 · pesan error 12–13 `danger` 500 di bawah. Wrapper `.field` memegang focus ring. Invalid: `aria-invalid="true"` + border merah tetap terlihat (tidak hanya saat fokus). Validasi saat submit pertama, lalu live.

## SegmentedChoice (Baik/Rusak)
52px, thumb bergeser 150ms. Rusak → buka catatan (wajib) + foto (wajib untuk kritis) dengan expand 220ms. Belum dijawab saat kirim → item diberi border merah + "Item ini belum dijawab" + scroll ke item pertama.

## SignaturePad
SVG/canvas, pointer events, `touch-action: none`, garis 2.5–3px `foreground`, garis dasar putus-putus, placeholder "Tanda tangan {nama}". Tombol "Ulangi"/"Hapus coretan". Mobile punya mode layar penuh (landscape). Hasil disimpan PNG (≤ 30 KB) + timestamp + GPS bila diizinkan.

## PhotoCapture
`<input type="file" accept="image/*" capture="environment">` → kompres di klien ke ±300 KB (lebar maks 1280, JPEG 0.7) → status: kosong · memproses · antre (offline) · mengunggah (progress) · gagal (Coba lagi) · selesai. Watermark teks: unit, waktu, site.

## Toast
sonner, gelap. Mobile: di atas bottom nav (offset 96) atau di atas bulk bar. Desktop: kanan bawah 24px. Dengan aksi "Urungkan" (kuning) 5 detik; tanpa aksi 2,6 detik. `role="status"`.

## EmptyState / ErrorState / OfflineBanner / Forbidden(403)
- Empty: judul 18/600 + teks + (opsional) aksi. Motif topo (`design/assets/topo-motif.png`) opacity .2–.3 di mobile.
- Error: "Data gagal dimuat" + kode + "Coba lagi".
- Offline: banner "Anda sedang offline." + jumlah antrean + jam data terakhir.
- 403: "403 · Akses ditolak" (mono) + judul + penjelasan + "Kembali ke Dashboard". Desktop: angka 403 outline besar dekoratif.

## Chart
Recharts dalam `ChartCard` (border 1 radius 14 p-16/18, judul 15/600, legenda kanan atas, catatan 12 muted di bawah).
- Line (tren kepatuhan/PA): garis 2px `chart-1`, titik 6px (10 saat hover) dengan ring background 2px, garis target putus `chart-ref`, crosshair vertikal + tooltip gelap. Y-axis label kiri `%`.
- Bar horizontal (item rusak): batang 14px `chart-1` radius kanan 4, nilai di kanan, klik = filter.
- Stacked column (kritis vs non-kritis): segmen dipisah gap 2px, total di atas batang, kolom berjalan diberi catatan.
- Heatmap (kepatuhan, PA): sel 26–30px radius 5, ikon di sel untuk status non-normal, tooltip per sel, legenda.
- Linimasa downtime (Gantt): jalur per unit 26px, batang status, garis "sekarang" 2px.
- Sparkline 80×28 `chart-2`, titik akhir.
Semua chart punya `aria-label` ringkasan + tabel/teks alternatif.

## Avatar
Lingkaran `muted`, inisial 2 huruf 600. "Sistem" = ink dengan teks putih.

## Komponen spesifik
| Komponen | Layar | Catatan |
|---|---|---|
| `ShiftDeadline` | Beranda driver | "Belum P2H · batas 06:30 · 18 mnt lagi" (warning), berubah danger saat lewat |
| `ChecklistProgress` | Form P2H | "Langkah 2 dari 6" + bar + "12/18 item" |
| `ApprovalTimeline` | Detail sesi | dikirim → menunggu (Hendra W.) → eskalasi → disetujui/ditolak |
| `AiSummary` | Ringkasan, Temuan | idle (tombol) → thinking (skeleton) → streaming (kursor kedip) → done ("Dibuat AI … periksa sebelum dibagikan") |
| `WhatsAppPreview` | Ringkasan | gelembung teks `pre-wrap`, hitungan karakter, toggle link rekap, Salin / Buka WhatsApp |
| `TrashTabs` | Master unit/site, Pengguna | tab "Aktif · n" / "Sampah · n", info 30 hari |
| `ConfirmTypeDelete` | hapus permanen | input mono, tombol aktif bila `HAPUS` |
| `ReasonDialog` | hapus sesi/entry, tolak P2H | chip alasan cepat + textarea, wajib |
