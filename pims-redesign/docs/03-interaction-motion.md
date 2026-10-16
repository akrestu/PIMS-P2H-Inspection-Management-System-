# 03 · Interaksi & motion

Library: `motion/react` untuk gesture & layout animation; CSS (token di `tokens.css`) untuk transisi sederhana.

## Spesifikasi perilaku
| Pemicu | Respons | Timing |
|---|---|---|
| Tekan tombol/kartu | scale .97 + latar muted; haptic 10ms (`navigator.vibrate(10)`) di aksi utama | dur-1 · standard |
| Pilih Baik/Rusak | thumb geser, warna berganti; Rusak membuka catatan + foto | dur-2 / dur-3 · out |
| Item dijawab | auto-scroll ke item berikutnya yang belum dijawab, berhenti di tengah layar | dur-4 · smooth |
| Progress checklist | bar melebar, angka `12/18` tanpa lompatan (`tnum`) | dur-4 · out |
| Buka bottom sheet | naik dari bawah, scrim 0→40%; snap 50%/92%; drag turun > 30% tinggi = tutup | dur-4 · out |
| Swipe kartu (Persetujuan) | ambang 96px atau v > 500px/s memicu aksi; di bawahnya kembali (spring) | dur-3 · pop. `drag="x" dragElastic={0.2}` |
| Long-press | 450ms (batal bila bergeser > 8px) → mode pilih, haptic 15ms, bulk bar muncul | dur-3 · out |
| Pull-to-refresh | tarik ≥ 64px → spinner; rilis memuat ulang; toast hasil. `preventDefault` pada pointerdown mouse agar teks tidak terseleksi | dur-3 |
| Aksi bisa dibatalkan | optimistic update + toast "Urungkan" 5 dtk; server commit setelah toast hilang **atau** soft-delete langsung + restore saat urungkan | dur-3 · out |
| Memuat data | skeleton shimmer hanya bila > 300ms | 1.2s linear |
| KPI tampil | count-up dari 0, sekali per sesi | 800ms · out |
| P2H terkirim | lingkaran pop + centang digambar (stroke-dashoffset) + ring memudar | dur-5 · pop |
| Error validasi | shake 4px ×2 pada tombol/field + haptic `[20,40,20]` | 220ms |
| Drawer desktop | fade + slide 24px dari kanan | dur-3 · out |
| Tooltip | muncul 300ms setelah hover / langsung saat fokus keyboard, fade 150ms | |
| AI streaming | teks bertambah per 5–6 karakter tiap 24–30ms, kursor blok berkedip; `aria-live="polite"` | |

## Pintasan keyboard (desktop)
| Layar | Tombol | Aksi |
|---|---|---|
| Persetujuan | ↑ / ↓ (atau k / j) | pindah P2H |
| | A | setujui P2H aktif (butuh tanda tangan) |
| | R | buka dialog tolak |
| | Spasi | pilih/batal pilih untuk massal |
| Semua tabel | Esc | tutup drawer/dialog |
| Global | `/` | fokus pencarian di halaman (opsional) |
Pintasan diabaikan saat fokus di input/textarea atau dialog terbuka. Tampilkan petunjuk pintasan (mono 12 muted) di header.

## Reduced motion
`prefers-reduced-motion: reduce` **atau** `data-motion="reduced"` di `<html>` (toggle di Akun > Tampilan bila diinginkan): semua durasi → 1ms, tanpa count-up, tanpa shake, scroll langsung, swipe tetap berfungsi tapi tanpa animasi lanjutan.

## Haptic
Hanya Android (Vibration API). Selalu dalam `try/catch`. Jangan untuk setiap ketukan — hanya: aksi utama (10ms), masuk mode pilih (15ms), error (`[20,40,20]`), P2H terkirim (`[10,30,10]`).
