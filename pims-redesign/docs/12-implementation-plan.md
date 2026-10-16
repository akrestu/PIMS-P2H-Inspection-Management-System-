# 12 · Rencana implementasi & acceptance criteria

Kerjakan per fase; setiap fase selesai = lulus tes + cek visual terhadap `design/screens/*.png` di 3 tema.

## Fase 0 — Fondasi (½–1 hari)
- [ ] Laravel 12 + Breeze/Inertia React TS (atau starter kit React), Vite, Pest, Vitest, Playwright.
- [ ] `design/tokens.css` → `resources/css/app.css`; shadcn init (style new-york, base color zinc, CSS variables) lalu **pertahankan** variabel PIMS.
- [ ] Font Geist & Geist Mono self-host. `<html lang="id" data-theme>` + script anti-flash tema.
- [ ] Helper format `id-ID` (`formatNumber`, `formatHM`, `formatPercent`, `formatDate`, `formatTime(tz)`, `formatDuration`).
**AC**: halaman kosong bertema light/dark/hc; `tnum` & font benar.

## Fase 1 — Komponen (1–2 hari)
- [ ] Semua komponen di `02-components.md`; halaman dev `/_dev/komponen` meniru `design/screens/Komponen.png`.
**AC**: setiap komponen punya state default/pressed/focus/disabled/loading/error; lulus axe.

## Fase 2 — Data & auth (2 hari)
- [ ] Migrasi + model + factory + seeder dari `data/*.json` (`07-data-model.md`).
- [ ] Fortify: login **NRP + kata sandi** untuk semua peran (layar `screens/auth.md`), reset via email/WA, verifikasi email, 2FA (wajib Admin), throttle 5×/60 dtk per NRP+IP.
- [ ] Policies + shared props `can` (`05`). AppLayout mobile/desktop + Sidebar + BottomNav + pemilih site.
**AC**: 3 akun seed (Admin Rina 19850704, Manager Hendra 19870312, Driver Budi 20231045) masuk dengan NRP & melihat navigasi sesuai peran; pesan gagal sama untuk NRP tak dikenal & sandi salah; Manager membuka `/admin/audit` → 403.

## Fase 3 — Alur driver (3–4 hari) — prioritas tertinggi
- [ ] Beranda (5 keadaan), Form P2H 6 langkah + sukses, draft IndexedDB, kompres foto, tanda tangan, Riwayat.
- [ ] Server: simpan entry idempoten (`client_uuid`), hitung hasil, BD otomatis + downtime + temuan + notifikasi + audit (`08#2–3`).
**AC (Pest)**: item kritis rusak → `tidak_layak`, unit `bd`, downtime terbuka, temuan tenggat 18:00; entry kedua di sesi sama → entry tambahan; `client_uuid` ganda tidak membuat duplikat; HM < HM terakhir ditolak.
**AC (Playwright, mobile 390)**: isi P2H lengkap < 2 menit simulasi; mode offline → antre → online → terkirim.

## Fase 4 — Operasional Manager (4–5 hari)
- [ ] Dashboard, Monitoring (polling/websocket), Persetujuan (mobile swipe + desktop master-detail + pintasan), Temuan (+ tutup + AI), Notifikasi (+ preferensi), Kepatuhan.
- [ ] Job: eskalasi tiap menit, pengingat P2H, ringkasan temuan 07:00.
**AC**: eskalasi tepat 15 menit; setujui massal butuh tanda tangan; tolak butuh alasan & membuka kembali unit; tutup temuan butuh foto + catatan; perhitungan kepatuhan ok/late/miss/off sesuai `08#1` (uji batas 06:30:00 vs 06:30:01, zona WITA).

## Fase 5 — Laporan (3 hari)
- [ ] Ringkasan harian (+ teks WA + AI), Laporan periode (+ PDF), Analitik unit, Monitoring PA, Downtime (linimasa), Rekap publik.
**AC**: PA = rumus `08#6` (uji downtime lintas tengah malam); teks WA persis format di `screens/laporan.md`; rekap publik tanpa nama orang, token lama → halaman tidak aktif.

## Fase 6 — Data master & admin (3 hari)
- [ ] Master unit/site (+ import Excel `maatwebsite/excel` atau `openspout`), Pengguna (undangan, peran, nonaktif), Sampah + job purge 30 hari, Audit log, Pengaturan, Akun (2FA, sesi, tema, hapus akun).
**AC**: hapus permanen hanya Admin + ketik HAPUS; audit tercatat untuk setiap aksi di `08#8`; Manager tidak bisa mengubah akun Manager/Admin (server menolak 403).

## Fase 7 — PWA, a11y, polish (2 hari)
- [ ] Manifest, service worker, background sync, web push (`11`).
- [ ] Reduced motion, axe di semua halaman × 3 tema, navigasi keyboard, TalkBack alur driver (`04`).
- [ ] Performa: bundle driver < 200 KB gzip.

## Keputusan terbuka (tanyakan ke product owner)
1. Provider WhatsApp Business API & template pesan.
2. Database (MySQL vs PostgreSQL) dan hosting (on-prem site vs cloud).
3. Penyedia AI & kebijakan data (default: Anthropic Claude API, server-side).
4. Penugasan unit per shift (dari sistem dispatch lain atau input manual?).
5. Apakah HM akhir shift wajib (untuk utilisasi) atau opsional.
6. Template checklist berbeda per jenis unit (saat ini 18 item sama untuk semua).
