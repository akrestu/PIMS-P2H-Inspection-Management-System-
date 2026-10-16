# 11 · PWA & offline

Driver sering di area sinyal lemah. **Form P2H harus berfungsi penuh offline.** Manager/Admin cukup "offline-tolerant" (banner + data cache terakhir, aksi tulis dinonaktifkan dengan penjelasan).

## Manifest
`name: "PIMS — P2H Management System"`, `short_name: "PIMS"`, `lang: "id"`, `display: "standalone"`, `orientation: "portrait"` (driver), `theme_color: "#0A0A0A"`, `background_color: "#FFFFFF"`, ikon dari `design/assets/pims-logo.png` (192, 512, maskable dengan padding 20%). `start_url: "/"`.

## Service worker (vite-plugin-pwa, `injectManifest`)
- Precache: shell aplikasi (JS/CSS/font Geist/ikon).
- Runtime: halaman Inertia `GET` → NetworkFirst (timeout 4 dtk) dengan fallback cache; gambar → CacheFirst 30 hari; API data master driver (unit di site, item checklist, profil) → StaleWhileRevalidate.
- Background Sync (`workbox-background-sync`) untuk antrean kirim P2H; fallback: coba kirim saat event `online` / app dibuka.
- Web Push handler (notifikasi).

## Antrean P2H offline
1. Setiap perubahan form → simpan draft di IndexedDB (`drafts/{unitId}-{date}-{shift}`), tampilkan "Draft tersimpan otomatis · HH:MM".
2. Kirim saat offline → buat record `outbox` `{client_uuid, payload, photos[] (Blob terkompres), signature (Blob), created_at}`; layar sukses tetap tampil dengan label "Antre, unggah saat online".
3. Sinkron: unggah foto (multipart, retry eksponensial maks 5×, status per foto: antre/mengunggah %/gagal "Coba lagi"), lalu POST entry dengan `client_uuid` (server idempoten: uuid sama → kembalikan entry yang ada).
4. Konflik: unit sudah di-P2H oleh driver lain di shift itu → server simpan sebagai **entry tambahan** (ganti driver) dan tandai "dikirim offline"; beri tahu driver.
5. Beranda menampilkan jumlah antrean + jam data terakhir; banner offline di semua layar.

## Ukuran & performa
- Kompres foto di klien (lebar maks 1280, JPEG q 0.7, target ±300 KB) — gunakan `browser-image-compression` atau canvas.
- Bundle awal driver < 200 KB gzip; route-level code splitting (chart & tabel hanya untuk Manager).
- Target: TTI < 3 dtk di 3G lambat untuk Beranda driver.
