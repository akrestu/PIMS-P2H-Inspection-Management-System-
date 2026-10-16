# 01 · Design tokens

File siap pakai: **`design/tokens.css`**. Salin isinya ke `resources/css/app.css` (atau `@import` dari sana). Variabel kompatibel dengan shadcn/ui (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--sidebar-*`, `--chart-*`) dan ditambah token PIMS (`--brand*`, status `--success|warning|info|danger` + `-soft`, `--muted-2`, `--chart-ref`, `--scrim`, `--bw`, `--fw-body`, `--fs-body`, `--shadow-1..3`).

Referensi visual lengkap: `design/screens/Main.png` (Foundations) dan `design/screens/Komponen.png`.

## Tema

`<html data-theme="light|dark|hc">`. Tailwind variant `dark:` dan `hc:` sudah didefinisikan.

| Tema | Kapan | Catatan |
|---|---|---|
| `light` | default | |
| `dark` | preferensi user / sistem | `--primary` jadi kuning (tombol utama kuning, teks hitam) |
| `hc` | kontras tinggi / outdoor terik | border 2px (`--bw`), body 17px/500, teks status ≥ 7:1, bayangan diganti outline |

Pilihan tersimpan per perangkat (`localStorage: pims.theme`, nilai `light|dark|hc|system`). Set atribut sebelum paint (script inline di `app.blade.php`) agar tidak berkedip.

## Warna

### Brand (kuning) — aksen saja
| Step | Hex | Teks di atasnya |
|---|---|---|
| 50 | #FEFBE8 | hitam |
| 100 | #FDF5C3 | hitam |
| 200 | #FBEA8A | hitam |
| 300 | #F8DC52 | hitam |
| **400 (brand)** | **#F4D435** | hitam (13.9:1) |
| 500 | #DDB80F | hitam |
| 600 | #B98F0A | putih |
| 700–950 | #94690D · #7A5312 · #684415 · #3D2408 | putih |

Boleh: CTA utama "Isi P2H", indikator tab/nav aktif (garis 24×3 mobile, 3×20 sidebar), focus ring, seri utama chart (pakai `--chart-1`, bukan brand-400), tombol "Urungkan" di toast gelap, bar aksi massal (tombol primer). **Tidak boleh**: teks kuning di latar putih (1.5:1), dekorasi angka, status.

### Netral
Zinc. Ink `#0A0A0A` untuk teks & tombol utama (light), juga latar dark.

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
| Token | Light | Dark | HC | Dipakai |
|---|---|---|---|---|
| `chart-1` | #C99A06 | #B38D0E | #8A6A00 | seri utama (P2H masuk, kepatuhan, PA, item rusak) |
| `chart-2` | #2563EB | #3577E8 | #0A3696 | seri ke-2 (site kedua, sparkline tren) |
| `chart-3` | #E8590C | #D9600F | #B23A00 | seri ke-3 |
| `chart-4` | #0F8F82 | #13907F | #00665C | seri ke-4 |
| `chart-5` | #7C3AED | #8455EE | #5B21B6 | seri ke-5; > 5 → "Lainnya" |
| `chart-ref` | #18181B | #E4E4E7 | #000 | garis target / baseline (putus-putus) |

Pengecualian yang disengaja: **stacked kritis vs non-kritis** memakai `danger` + `chart-1` (status bermakna), dengan legenda. **Heatmap kepatuhan** memakai `foreground` (tepat waktu), `brand` + ikon jam (terlambat), `danger-soft` + border + ikon × (tidak P2H), arsir (tidak wajib). **Heatmap PA** memakai ramp kuning 5 tingkat (lihat `screens/laporan.md`).

## Tipografi — Geist / Geist Mono
| Token | Mobile (px) | Desktop (px) | Bobot | Tracking | Pakai |
|---|---|---|---|---|---|
| display | 32/36 | 48/52 | 600 | -0.03em | angka hero |
| title | 24/30 | 28/34 | 600 | -0.02em | judul halaman |
| heading | 20/28 | 20/28 | 600 | -0.01em | judul seksi/sheet |
| body-lg | 18/26 | 17/26 | 500 | 0 | nama item checklist |
| body | 16/24 | 15/22 | 400 | 0 | teks umum (mobile min 16) |
| label | 14/20 | 14/20 | 500 | 0 | label form, tombol kecil |
| caption | 13/18 | 13/18 | 400 | 0 | meta, waktu |
| overline | 12/16 | 12/16 | 600 | 0.06em, UPPERCASE | grup nav, header tabel |
| kpi | 36/40 | 44/48 (kartu: 28) | 600 | -0.03em | angka KPI, selalu `tnum` |

Geist Mono: kode/ID (`T-0231`, `AL-90215`, token, IP), pintasan keyboard. Kode unit (`DT-1045`) memakai Geist 600 + `tnum`.

## Ruang, radius, elevasi
- Spacing basis 4: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Gutter mobile 16; jarak grup 24–32; padding surface 16–20.
- Radius: kontrol desktop 10, kontrol mobile/tombol 12, surface/kartu/tabel 14, sheet 20, pill/avatar full.
- Elevasi nyaris tak terlihat: `shadow-sm` (list), `shadow-md` (thumb segmented, kartu fokus), `shadow-lg` (sheet, drawer, dialog, toast). Dark: bayangan + ring 1px putih transparan. HC: tanpa bayangan, outline 2px.

## Ukuran sentuh
Min 48×48. Kontrol form driver 52. Tombol CTA sticky mobile 56. Jarak antar target ≥ 8. Ikon 16/20/24 (lucide, stroke 1.75; 2 untuk 16px).

## Breakpoint & layout
| Nama | Lebar | Layout |
|---|---|---|
| base | 0–767 | 4 kolom, margin 16. App bar blur 64–72, bottom nav 84 (5 item, tengah 56), sheet bawah (vaul). |
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
