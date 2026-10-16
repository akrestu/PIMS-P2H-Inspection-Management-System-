# CLAUDE.md — PIMS (P2H Management System)

Kamu (Claude Code) membangun **PIMS**: aplikasi P2H (Pemeriksaan & Perawatan Harian / pre-start check) untuk unit & alat berat tambang. Paket ini adalah serah terima desain lengkap. **Baca file ini dulu, lalu `docs/` sesuai urutan di bawah sebelum menulis kode.**

## Sumber kebenaran (urutan prioritas)

1. `docs/08-business-rules.md` — aturan bisnis (menang atas apa pun yang tampak di prototype).
2. `docs/05-roles-permissions.md` — siapa boleh apa.
3. `docs/screens/*.md` — spesifikasi per layar (layout, state, validasi, aksi).
4. `design/tokens.css` + `docs/01-design-tokens.md` — semua warna, radius, motion. **Jangan pakai warna hex langsung di komponen.**
5. `design/screens/*.png` — tangkapan layar prototype (lihat gambarnya untuk layout & hierarki).
6. `design/prototypes/*.dc.html` — kode prototype interaktif (referensi perilaku; **bukan** kode produksi, jangan disalin mentah).

Angka di prototype adalah **data contoh** dan tidak selalu konsisten antar layar. Ambil logikanya, bukan angkanya.

## Stack (asumsi — konfirmasi ke user bila berbeda)

- Backend: **Laravel 12** (PHP 8.3), MySQL 8 / PostgreSQL 16, queue (Redis), scheduler.
- Frontend: **Inertia.js 2 + React 19 + TypeScript**, Vite.
- UI: **Tailwind CSS v4** + **shadcn/ui** (Radix), **vaul** (Drawer/bottom sheet), **sonner** (toast), **Recharts** (chart), **lucide-react** (ikon), **motion** (`motion/react`, gesture & animasi).
- Font: **Geist** + **Geist Mono** (paket `geist` atau self-host).
- PWA: `vite-plugin-pwa` (Workbox) + IndexedDB (`idb-keyval` atau Dexie) untuk antrean P2H offline.
- Auth: Laravel Fortify (login, reset, verifikasi email, 2FA TOTP). **Semua peran login dengan NRP (8 digit) + kata sandi** (`Fortify::username()` = `nrp`). 2FA wajib untuk Admin. Layar masuk final: `docs/screens/auth.md` (desktop kartu kaca terang/gelap mengikuti tema, mobile foto hero).
- Tes: Pest (backend), Vitest + Testing Library (frontend), Playwright (E2E alur kritis).

## Urutan kerja yang disarankan

Ikuti `docs/12-implementation-plan.md`. Ringkas:
1. Setup proyek, `design/tokens.css` → `resources/css/app.css`, shadcn init, font, tema (`data-theme` di `<html>`).
2. Komponen dasar (`docs/02-components.md`) + halaman `/_dev/komponen` untuk cek visual.
3. Migrasi & model (`docs/07-data-model.md`), seeder dari `data/*.json`.
4. Auth + layout (AppShell mobile bottom-nav / desktop sidebar).
5. Alur Driver: Beranda → Form P2H (offline-first) → Riwayat.
6. Alur Manager: Dashboard, Monitoring, Persetujuan, Temuan, Notifikasi.
7. Laporan, Master data, Admin.
8. PWA/offline, a11y pass, E2E.

## Aturan wajib

- **Bahasa UI: Indonesia.** Pakai teks persis dari spesifikasi layar & `docs/10-copy.md`. Format angka `12.480,5`, tanggal `16 Okt 2026`, jam 24-jam `06:00`, zona waktu per site (WIB/WITA/WIT).
- **Mobile-first**: desain dasar 390px, lalu `md` (768) dan `lg` (1024) / `2xl` (1440). Desktop memakai sidebar 264px; mobile memakai bottom nav.
- **Kuning (#F4D435 / `brand`) hanya untuk**: CTA utama "Isi P2H", tab/indikator aktif, focus ring, seri utama chart. Teks di atas kuning selalu hitam. Jangan untuk dekorasi angka/teks.
- **Status tidak pernah warna saja**: selalu pill + titik/ikon + label.
- Target sentuh ≥ 48px (CTA mobile 56px). Input mobile font 16px (cegah zoom iOS).
- Semua angka `tabular-nums` (`tnum`).
- Setiap layar data punya 5 keadaan: memuat (skeleton), kosong, error, offline, 403.
- Aksi destruktif/massal: toast dengan **Urungkan** 5 detik (soft-delete). Hapus permanen hanya Admin dengan mengetik `HAPUS`.
- Setiap perubahan data → **Audit Log** (lihat `docs/08-business-rules.md#audit`).
- Hormati `prefers-reduced-motion` dan toggle `data-motion="reduced"`.
- Tema: `light`, `dark`, `hc` (kontras tinggi outdoor). Uji ketiganya.
- Jangan tambah dependensi besar tanpa alasan; jangan pakai warna di luar token.

## Peta folder paket

```
CLAUDE.md                 ← file ini
README.md                 ← ringkasan untuk manusia
docs/
  00-overview.md          produk, peran, glosarium
  01-design-tokens.md     token → Tailwind/shadcn
  02-components.md        komponen + props + state
  03-interaction-motion.md gesture, motion, toast, pintasan keyboard
  04-accessibility.md
  05-roles-permissions.md matriks akses
  06-routes-navigation.md rute Inertia, layout, navigasi
  07-data-model.md        entitas, kolom, enum, relasi
  08-business-rules.md    aturan P2H, BD, approval, eskalasi, kepatuhan, PA, Sampah, audit
  09-notifications-ai.md  notifikasi, WhatsApp, AI
  10-copy.md              microcopy & format
  11-pwa-offline.md       PWA & antrean offline
  12-implementation-plan.md urutan + acceptance criteria
  screens/                spesifikasi per layar
design/
  tokens.css              token Tailwind v4 siap pakai
  screens/*.png           tangkapan layar prototype
  prototypes/*.dc.html    prototype interaktif (referensi)
  assets/                 logo, foto contoh, motif topo
data/*.json               data contoh untuk seeder & storybook
```
