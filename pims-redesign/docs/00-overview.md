# 00 · Ringkasan produk

## Masalah
Di site tambang, driver/operator wajib melakukan P2H sebelum mengoperasikan unit setiap shift. Selama ini memakai kertas: lambat direkap, sering terlambat, kerusakan kritis tidak langsung menghentikan unit, dan manajemen tidak punya data kepatuhan & ketersediaan (PA) yang akurat.

## Solusi
PIMS adalah PWA mobile-first:
- **Driver** mengisi P2H 18 item dalam ±2 menit, bisa offline, dengan foto & tanda tangan.
- Item **kritis** yang rusak → P2H **Tidak Layak** → unit otomatis **BD** (breakdown) dan temuan dibuat.
- **Manager** (pengawas) menyetujui P2H, memantau siapa yang belum P2H, menindaklanjuti temuan, melihat kepatuhan & PA, dan mengirim rekap harian ke WhatsApp.
- **Admin** mengelola master data, pengguna, pengaturan, dan audit.

## Peran
| Peran | Perangkat utama | Ringkas |
|---|---|---|
| Driver | HP Android (PWA), sering di bawah terik, pakai sarung tangan | Isi P2H, lihat riwayat & temuan unitnya |
| Manager | HP + laptop | Persetujuan, monitoring, temuan, laporan, data master (terbatas) |
| Admin | Laptop | Semua + pengguna, pengaturan, audit log, hapus permanen |

Detail: `05-roles-permissions.md`.

## Glosarium
| Istilah | Arti |
|---|---|
| **P2H** | Pemeriksaan & Perawatan Harian. Satu **sesi** = satu unit per shift; bisa berisi beberapa **entry** bila driver berganti dalam shift. |
| **Item kritis** | Item checklist yang bila Rusak membuat unit tidak boleh beroperasi (rem utama, rem parkir, kemudi, sabuk, klakson & alarm mundur, kebocoran, ban & mur roda). |
| **Layak / Tidak Layak** | Hasil P2H. Tidak Layak bila ≥ 1 item kritis Rusak. |
| **Status unit** | `Ready`, `BD` (breakdown), `PM` (preventive maintenance terjadwal), `Servis` (perbaikan non-BD). |
| **HM** | Hour meter (jam operasi mesin), desimal 1 angka, format `12.481,0`. |
| **KM** | Odometer (untuk LV / truk). |
| **BBM** | Level tangki: `Kosong`, `¼`, `½`, `¾`, `Penuh`. |
| **LV** | Light Vehicle (mobil 4×4). P2H LV disetujui oleh **Approver LV** (Manager yang ditandai). |
| **Temuan** | Kerusakan yang tercatat dari P2H (atau manual), punya PJ (penanggung jawab), tenggat, status Open/Closed. |
| **PJ** | Penanggung jawab perbaikan (mekanik/elektrik/tim body/tim ban). |
| **Eskalasi** | P2H belum disetujui > 15 menit → dinaikkan ke seluruh Manager site. |
| **Kepatuhan** | % P2H tepat waktu dari unit yang wajib P2H. |
| **PA** | Physical Availability = jam Ready ÷ 24 jam (per unit per hari; armada = rata-rata). |
| **Downtime** | Periode unit tidak Ready (BD/PM/Servis). |
| **Sampah** | Soft-delete 30 hari; setelah itu terhapus permanen otomatis. |
| **Rekap publik** | Halaman read-only tanpa login (token per site) untuk link di pesan WhatsApp. |
| **Site** | Lokasi kerja (Pit A, Pit B, Hauling Road, Jetty, Workshop) dengan zona waktu sendiri. |

## Inventaris layar (prototype)
Lihat `design/screens/*.png`. Spesifikasi di `docs/screens/`.

| # | Layar | Mobile | Desktop | Peran |
|---|---|---|---|---|
| 1 | **Masuk (final, NRP + kata sandi)** | Login-M | Login | Semua |
| 2–6 | Auth: lupa, tautan terkirim, reset, verifikasi, 2FA | Auth | (kartu terpusat) | Semua |
| 7 | Beranda Driver | BerandaDriver | — | Driver |
| 8 | Form P2H (6 langkah + sukses) | FormP2H | — (driver di HP) | Driver |
| 9 | Riwayat P2H + detail sesi | RiwayatP2H | RiwayatP2H-Desktop | Semua |
| 10 | Dashboard | Dashboard | Dashboard-Desktop | Manager/Admin |
| 11 | Monitoring P2H hari ini | Monitoring | Monitoring-Desktop | Manager/Admin |
| 12 | Kepatuhan | Kepatuhan | Kepatuhan-Desktop | Manager/Admin |
| 13 | Persetujuan | Persetujuan | Persetujuan-Desktop | Manager/Admin |
| 14 | Temuan | Temuan | Temuan-Desktop | Manager/Admin (+Driver baca unitnya) |
| 15 | Notifikasi | Notifikasi | Notifikasi-Desktop | Semua |
| 16 | Ringkasan harian (AI + WhatsApp) | RingkasanHarian | RingkasanHarian-Desktop | Manager/Admin |
| 17 | Laporan periode | LaporanPeriode | LaporanPeriode-Desktop | Manager/Admin |
| 18 | Analitik unit | AnalitikUnit | Analitik-Desktop | Manager/Admin |
| 19 | Monitoring PA | MonitoringPA | PA-Desktop | Manager/Admin |
| 20 | Downtime | Downtime | Downtime-Desktop | Manager/Admin |
| 21 | Rekap publik | RekapPublik | (responsif) | Publik (token) |
| 22 | Master unit | MasterUnit | MasterUnit-Desktop | Admin (Manager baca) |
| 23 | Master site | MasterSite | (pola Master unit) | Admin |
| 24 | Pengguna & driver | Pengguna | Pengguna-Desktop | Admin; Manager hanya driver |
| 25 | Audit log | AuditLog | AuditLog-Desktop | Admin (Manager 403) |
| 26 | Pengaturan | Pengaturan | Pengaturan-Desktop | Admin (Manager 403) |
| 27 | Akun saya | Akun | Akun-Desktop | Semua |
| — | Foundations & Komponen | Main, Komponen | — | referensi DS |
