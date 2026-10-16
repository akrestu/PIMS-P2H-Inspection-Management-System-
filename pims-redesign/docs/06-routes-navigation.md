# 06 · Rute, halaman Inertia, navigasi

Satu halaman Inertia per rute; komponen halaman **responsif** (mobile ↔ desktop di komponen yang sama, beda layout lewat breakpoint), kecuali disebut terpisah. Lokasi: `resources/js/pages/…`. Layout: `AppLayout` (AppShell), `AuthLayout`, `PublicLayout`.

Shared props (HandleInertiaRequests): `auth.user {id,name,role,initials,sites[],is_lv_approver}`, `can {…}`, `site {active, options[]}`, `counts {approvals, findings_open, notifications_unread}`, `flash`, `settings {shifts, p2h_deadline_minutes, tz}`, `server_time`.

| Metode & URI | Nama | Halaman | Peran | Prototype |
|---|---|---|---|---|
| GET `/login` | login | auth/Login (NRP + kata sandi; responsif) | tamu | Login, Login-M, LoginNRPForm |
| GET `/forgot-password`, `/reset-password/{token}` | password.* | auth/ForgotPassword, ResetPassword | tamu | Auth |
| GET `/email/verify` | verification.notice | auth/VerifyEmail | login | Auth |
| GET `/two-factor-challenge` | two-factor.login | auth/TwoFactor | login | Auth |
| GET `/` | home | redirect: driver → `/beranda`, lainnya → `/dashboard` | | |
| GET `/beranda` | driver.home | driver/Beranda | Driver | BerandaDriver |
| GET `/p2h/baru?unit=` | p2h.create | p2h/Form | Driver+ | FormP2H |
| POST `/p2h` | p2h.store | (redirect sukses) | Driver+ | |
| GET `/riwayat` | p2h.index | p2h/Riwayat | semua | RiwayatP2H(-Desktop) |
| GET `/riwayat/{session}` | p2h.show | p2h/DetailSesi (drawer di desktop, halaman di mobile) | semua | RiwayatP2H |
| GET `/riwayat/{session}/pdf` | p2h.pdf | file | | |
| DELETE `/riwayat/{session}` · `/riwayat/{session}/entry/{entry}` | p2h.destroy | (body: reason) | Admin | |
| GET `/dashboard` | dashboard | manager/Dashboard | Manager, Admin | Dashboard(-Desktop) |
| GET `/monitoring` | monitoring | manager/Monitoring | M, A | Monitoring(-Desktop) |
| POST `/monitoring/ingatkan` | monitoring.remind | (unit_ids[]) | M, A | |
| GET `/kepatuhan?range=7|14|30` | compliance | manager/Kepatuhan | M, A | Kepatuhan(-Desktop) |
| GET `/persetujuan` | approvals.index | manager/Persetujuan | M, A | Persetujuan(-Desktop) |
| POST `/persetujuan/setujui` | approvals.approve | (entry_ids[], signature) | M, A | |
| POST `/persetujuan/{entry}/tolak` | approvals.reject | (reason) | M, A | |
| GET `/temuan` · `/temuan/{finding}` | findings.* | manager/Temuan | M, A (+driver baca) | Temuan(-Desktop) |
| POST `/temuan/{f}/tutup` · `/temuan/pj` · POST `/temuan/{f}/ai` | findings.close / assign / ai | | M, A | |
| GET `/notifikasi` | notifications | Notifikasi | semua | Notifikasi(-Desktop) |
| GET `/laporan/ringkasan?tanggal=` | reports.daily | laporan/RingkasanHarian | M, A | RingkasanHarian(-Desktop) |
| GET `/laporan/periode` | reports.period | laporan/Periode | M, A | LaporanPeriode(-Desktop) |
| GET `/laporan/analitik` | reports.analytics | laporan/AnalitikUnit | M, A | AnalitikUnit / Analitik-Desktop |
| GET `/laporan/pa?minggu=` | reports.pa | laporan/MonitoringPA | M, A | MonitoringPA / PA-Desktop |
| GET/POST/PUT/DELETE `/downtime` | downtime.* | laporan/Downtime | M, A | Downtime(-Desktop) |
| GET `/master/unit` (+ import, export, sampah) | units.* | master/Unit | M (site), A | MasterUnit(-Desktop) |
| GET `/master/site` | sites.* | master/Site | A (M baca) | MasterSite |
| GET `/pengguna` | users.* | master/Pengguna | M (driver), A | Pengguna(-Desktop) |
| GET `/admin/audit` | audit.index | admin/AuditLog | A | AuditLog(-Desktop) |
| GET/PUT `/admin/pengaturan` | settings.* | admin/Pengaturan | A | Pengaturan(-Desktop) |
| GET `/akun` | account | Akun | semua | Akun(-Desktop) |
| GET `/r/{site}/{token}` | public.recap | public/Rekap | publik | RekapPublik |

Query string untuk filter/sort/pagination (`?q=&status=&sort=-tanggal&page=2`) — gunakan `router.get(..., { preserveState: true, preserveScroll: true, replace: true })` agar filter bisa dibagikan via URL.

## Navigasi
- Mobile bottom nav & sidebar desktop: lihat `02-components.md#appshell`. Persetujuan menampilkan badge jumlah menunggu (merah); Temuan & Notifikasi angka abu.
- Halaman detail mobile memakai tombol kembali di app bar (`history.back()` dengan fallback ke daftar).
- Desktop: detail sebagai **drawer kanan** di atas daftar (URL tetap berubah ke `/…/{id}` agar bisa dibagikan; tutup → kembali ke daftar dengan filter dipertahankan).
