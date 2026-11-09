# 01 · Design tokens

File siap pakai: **`design/tokens.css`**. Salin isinya ke `resources/css/app.css` (atau `@import` dari sana). Variabel kompatibel dengan shadcn/ui (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--sidebar-*`, `--chart-*`) dan ditambah token PIMS (`--brand*`, status `--success|warning|info|danger` + `-soft`, `--muted-2`, `--chart-ref`, `--scrim`, `--bw`, `--fw-body`, `--fs-body`, `--shadow-1..3`).

Referensi visual: `design/screens/Komponen.png` dan pola di **`docs/13-gaya-mywahana.md`**. Gaya = MyWahana "Sunlit Calm" (sumber: `design/prototypes/mw.css`).

## Tema

`<html data-theme="light|dark">`. Tailwind variant `dark:` sudah didefinisikan. **Tidak ada tema kontras tinggi.**

| Tema | Kapan | Catatan |
|---|---|---|
| `light` | default | latar krem `#F7F6F2`, kartu putih, tombol utama hitam `#141414` |
| `dark` | preferensi user / sistem | latar `#0F0F0E`, kartu `#181816`, tombol utama terang `#F5F3EE` teks hitam |

Pilihan tersimpan per perangkat (`localStorage: pims.theme`, nilai `light|dark|system`). Set atribut sebelum paint (script inline di `app.blade.php`) agar tidak berkedip.

## Warna

### Inti (light / dark)
| Token | Light | Dark | Pakai |
|---|---|---|---|
| `background` | #F7F6F2 | #0F0F0E | latar halaman (krem) |
| `card` | #FFFFFF | #181816 | semua kartu, tabel, grafik, sheet |
| `muted` | #F1EEE6 | #22211F | segmented track, chip netral, avatar |
| `input-fill` | #F5F3EE | #22211F | isi field (tanpa garis) |
| `border` | #E7E3DA | #2E2D2A | pemisah baris di dalam kartu saja |
| `foreground` | #141414 | #F5F3EE | teks, tombol primer (light) |
| `muted-foreground` | #5F5A51 | #A8A397 | meta, label |

### Brand (kuning #F4D03F) — aksen saja
`brand` #F4D03F · `brand-soft` #FDF6D8 (dark #3A3214). Teks di atas kuning selalu hitam.

Boleh: CTA "Isi P2H", tombol sekunder di hero ("Lihat monitoring"), FAB tengah bottom nav (tema gelap), titik aktif sidebar, badge persetujuan, focus ring, seri utama chart (pakai `--chart-1`). **Tidak boleh**: teks kuning di latar putih, dekorasi angka, status.

### Status
success #1F6B3F/#E3F3E8 · warning #8A5300/#FDF0D5 · info #24508A/#E4ECF6 · danger #A3261B/#FBE4E1 · risk-extreme #5C1410 (nilai dark di `tokens.css`).

### Status semantik — selalu pill lembut + titik/ikon + label
| Token | Arti | Contoh label |
|---|---|---|
| `success` | Ready, Layak Pakai, Disetujui, Closed, Aktif | "Layak", "Ready" |
| `danger` | BD, Tidak Layak, Ditolak, Kritis, Lewat tenggat, Eskalasi | "BD", "Tidak layak" |
| `info` | PM, Servis, Open (temuan) | "PM", "Open" |
| `warning` | Menunggu, Belum P2H, Terlambat, Jatuh tempo hari ini | "Menunggu", "Belum P2H" |

Pola pill: `h-6 px-2.5 rounded-full bg-{status}-soft text-{status} text-xs font-semibold` + titik 6px `bg-current`. Varian solid (`bg-danger text-white`) hanya untuk "Tidak layak" dan "KRITIS".

**KRITIS** tag: `h-5 px-1.5 rounded-md bg-danger text-white text-[11px] font-bold tracking-wide uppercase`.

### Chart (divalidasi CVD ΔE ≥ 12, terang & gelap)
| Token | Light | Dark | Dipakai |
|---|---|---|---|
| `chart-1` | #C99A06 | #B38D0E | seri utama (P2H masuk, kepatuhan, PA, item rusak) |
| `chart-2` | #2563EB | #3577E8 | seri ke-2 (site kedua, sparkline tren) |
| `chart-3` | #E8590C | #D9600F | seri ke-3 |
| `chart-4` | #0F8F82 | #13907F | seri ke-4 |
| `chart-5` | #7C3AED | #8455EE | seri ke-5; > 5 → "Lainnya" |
| `chart-ref` | #18181B | #E4E4E7 | garis target / baseline (putus-putus) |

Pengecualian yang disengaja: **stacked kritis vs non-kritis** memakai `danger` + `chart-1` (status bermakna), dengan legenda. **Heatmap kepatuhan** memakai `foreground` (tepat waktu), `brand` + ikon jam (terlambat), `danger-soft` + border + ikon × (tidak P2H), arsir (tidak wajib). **Heatmap PA** memakai ramp kuning 5 tingkat (lihat `screens/laporan.md`).

## Tipografi — Plus Jakarta Sans / JetBrains Mono
| Token | Mobile (px) | Desktop (px) | Bobot | Pakai |
|---|---|---|---|---|
| hero | 28–34 | 34 | 800 | sapaan di hero ("Selamat pagi, Rina") |
| title (h1) | 24 | 28 | 800, -0.02em | judul halaman |
| heading | 17–20 | 17–20 | 700 | judul kartu/seksi |
| body | 16 | 15 | 500 | teks umum (input mobile 16) |
| label | 14 | 14 | 600 | label form, tombol |
| caption | 12–13 | 13 | 500 | meta, waktu |
| overline | 11–12 | 11–12 | 700, 0.06–0.12em UPPERCASE | grup nav, label KPI, "AKSI CEPAT" |
| kpi | 32 | 32 | 800, -0.03em | angka KPI, selalu `tnum` |

JetBrains Mono: kode/ID (`T-0231`, `AL-90215`, kode site `PTA`, token, IP).

## Ruang, radius, elevasi
- Spacing basis 4: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Gutter mobile 16; jarak grup 24–32; padding surface 16–20.
- Radius: chip/kode 8 · item list dalam kartu 12–14 · input 16 · **kartu/tabel/grafik 20** · sheet/drawer/hero/bottom nav 28 · **tombol, chip, segmented, avatar = pill (999)**.
- Elevasi nyaris tak terlihat: `shadow-sm` (list), `shadow-md` (thumb segmented, kartu fokus), `shadow-lg` (sheet, drawer, dialog, toast). Kartu tidak memakai garis tepi — cukup `shadow-1`. Dark: ring 1px putih transparan.

## Ukuran sentuh
Min 48×48. Kontrol form driver 52. Tombol CTA sticky mobile 56. Jarak antar target ≥ 8. Ikon 16/20/24 (lucide, stroke 1.75; 2 untuk 16px).

## Breakpoint & layout
| Nama | Lebar | Layout |
|---|---|---|
| base | 0–767 | 4 kolom, margin 16. App bar blur 64–72, bottom nav kaca melayang 72 (inset 12, FAB tengah 56), sheet bawah (vaul). |
| `md` 768 | tablet | 8 kolom, margin 24, nav rail 72. Sheet → dialog/drawer bawah lebar maks 560. |
| `lg` 1024 | laptop | Sidebar 264 + konten. List → tabel sortable. Sheet → drawer kanan 460–540. |
| `2xl` 1440 | desktop penuh | konten maks ~1200 (tabel boleh lebar penuh), gutter 24, padding halaman `clamp(16px,3vw,40px)`. |

## Motion
| Token | ms | Untuk |
|---|---|---|
| dur-1 | 90 | press (scale .97) |
| dur-2 | 150 | toggle, warna, hover |
| dur-3 | 220 | expand/collapse, toast, chip, fade |
| dur-4 | 320 | sheet, pindah langkah, progress bar |
| dur-5 | 600 | layar sukses; count-up KPI 800 |

Easing: `standard` (state di tempat), `out` (masuk), `in` (keluar, durasi ×0.75), `pop` (sukses; Motion spring stiffness 420 damping 30). Detail perilaku: `03-interaction-motion.md`.
