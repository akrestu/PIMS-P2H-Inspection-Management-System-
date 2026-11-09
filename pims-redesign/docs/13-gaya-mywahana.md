# 13 · Gaya MyWahana ("Sunlit Calm") untuk PIMS

PIMS tetap aplikasi & brand sendiri (logo PIMS), tetapi tampilannya mengikuti design system **MyWahana**. Dokumen ini adalah aturan visual yang **menggantikan** gaya v1 (`design/legacy/`). Bila ada konflik visual dengan dokumen lain, dokumen ini yang menang; aturan bisnis & perilaku tetap dari `08` dan `docs/screens/*`.

Prototype acuan: `design/prototypes/MW-*.dc.html` + `mw.css`. Gambar: `design/screens/*.png`.

## 1. Prinsip
- **Latar krem, konten di kartu putih.** Latar halaman `--background` (#F7F6F2). Setiap blok data — KPI, grafik, tabel, list, form seksi — berada di **kartu putih** (`--card`) radius **20**, tanpa garis tepi, `shadow-1`. Jangan menaruh tabel/list langsung di atas krem.
- **Tidak ada dua warna latar bertabrakan.** Elemen di dalam kartu (header tabel sticky, kolom kiri sticky, ring sel terpilih) memakai `--card`, bukan `--background`.
- **Tombol pill.** Semua tombol/chip/segmented `rounded-full`. Primer = hitam (`--primary`), sekunder = putih + garis `--input`, destruktif = teks `--danger`.
- **Input terisi tanpa garis**: bg `--input-fill`, radius 16, tinggi 52–56 (mobile). Fokus: garis foreground + ring kuning 4px.
- **Tipografi tebal**: judul 800, KPI 800, label overline uppercase 700.
- Hanya tema **light & dark**.

## 2. Hero foto gunung
Foto: `design/assets/hero-mountain.jpg` (overlay gradien gelap, teks putih). **Hanya** dipakai di:
- **Login** (mobile hero atas; desktop panel kiri kartu terpisah) — `auth.md`.
- **Beranda Driver** (header 236px; konten naik menimpa hero).
- **Dashboard desktop** (Manager/Admin): hero radius 28 tinggi ~310 di atas konten — pill "Shift 1 · 06:14 WITA" (titik hijau), sapaan "Selamat pagi, {nama}" 34/800, ringkasan 1 kalimat (unit belum P2H, Tidak Layak), dua tombol: "Lihat monitoring" (kuning) & "{n} menunggu persetujuan" (kaca). **Kartu KPI (5) menumpuk ke hero** (`margin-top: -56px`, inset 24).

Halaman lain (Akun, laporan, master data, dll.) **tidak** memakai hero foto.

## 3. Navigasi
- **Mobile — `MWBottomNav`**: lihat `02-components.md#appshell`. Bar kaca melayang, FAB + tengah membuka menu "AKSI CEPAT" (kartu radius 28 di atas bar). Ada di Beranda, Riwayat, Notifikasi, Akun (driver) dan Dashboard, Temuan, Persetujuan, layar Lainnya (manager). Isi scroll diberi padding bawah ≥ 120.
- **Desktop — `MWSidebar`**: latar putih, item aktif pill hitam + titik kuning, tag peran, pemilih site pill `--input-fill`, kartu akun di bawah (aktif juga pill hitam, teks putih).
- **Header desktop**: overline + judul, pencarian pill (`--input-fill`, hint ⌘K), filter pill putih, tombol hitam "Ekspor PDF"/CTA.

## 4. Komponen kunci
| Komponen | Spesifikasi |
|---|---|
| Kartu | `bg-card rounded-[20px] shadow-sm p-4 md:p-6`, tanpa border |
| KPI card | ikon 28 di kotak soft radius 10 · label 12 uppercase · angka 32/800 tnum · sub 13 (warna status bila perlu) |
| Tabel | di dalam kartu; header teks 13 muted (tanpa latar abu); baris tinggi 56–64 dipisah `border-t border-border`; hover `muted-2` |
| List mobile | baris di dalam satu kartu putih; item belum dibaca bg `muted-2` radius 14 |
| Segmented | track `muted` pill, thumb putih `shadow-1`, label aktif 700 |
| Status pill | tetap (titik + label, warna `-soft`) |
| Drawer desktop | kanan, inset 12, radius 28, `shadow-3` |
| Sheet mobile | radius atas 28 |
| Heatmap kepatuhan | sel 30 radius 8 di dalam kartu; kolom unit sticky ber-bg `card` |

## 5. Pemetaan layar → gambar
Nama gambar = nama prototype tanpa awalan `MW-`. Contoh: `MW-Dashboard-Desktop.dc.html` → `design/screens/Dashboard-Desktop.png`. Layar tambahan v2: `MasterSite-Desktop.png` (baru), `Auth-Lupa/Reset/Verifikasi/2FA.png`, `RekapPublik.png`, `Komponen.png`, `MWBottomNav.png`, `MWSidebar.png`, `MWLoginForm.png`.
Gambar di `docs/screens/*.md` yang menyebut nama lama (mis. `Login-Desktop.png`, `Sidebar.png`, `Main.png`) → lihat padanan MyWahana-nya di `design/screens/`; versi lama ada di `design/legacy/screens/`.

## 6. Yang tidak berubah
Aturan bisnis, peran, rute, data model, copy, PWA/offline, a11y (kecuali tema hc dihapus), dan perilaku interaksi tetap seperti dokumen 00–12.
