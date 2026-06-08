# PIMS — Preventive Inspection & Monitoring System

Dokumentasi teknis lengkap sistem PIMS.

---

## 1. Ringkasan Sistem

**PIMS** adalah aplikasi web untuk mendigitalisasi formulir fisik **WBK-HSE-FO-091** milik PT. Wahana Bandhawa Kencana. Sistem mengelola **P2H (Pemeriksaan & Perawatan Harian)** untuk armada kendaraan (Bus & Light Vehicle) di lingkungan tambang.

**Fungsi utama:**
- Pengisian formulir P2H digital oleh driver (hingga 4 slot per unit per hari)
- Monitoring ketersediaan operasional armada (Physical Availability / PA)
- Pelacakan downtime unit (BD, PM, Servis Berkala)
- Laporan kepatuhan P2H dan ekspor data (PDF & Excel)
- Notifikasi real-time untuk item kritis

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| Backend Framework | Laravel | 13.0 |
| Autentikasi | Laravel Fortify | ^1.34 |
| Otorisasi | Spatie Laravel Permission | ^7.3 |
| ORM | Eloquent (Laravel) | — |
| PDF Generation | Barryvdh DomPDF | ^3.1 |
| Excel Export | Maatwebsite Excel | ^3.1 |
| Frontend Integration | Inertia.js (server-side) | ^3.0 |
| Route Typing | Laravel Wayfinder | ^0.1.14 |
| Frontend Framework | React | 19.2.0 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 4.0.0 |
| UI Components | Radix UI (headless) | — |
| Charts | Recharts | 3.8.1 |
| Toast Notifications | Sonner | 2.0.0 |
| Icons | Lucide React | 0.475.0 |
| Date Utilities | date-fns | 4.1.0 |
| Signature Canvas | react-signature-canvas | 1.1.0-alpha |
| Build Tool | Vite | 8.0.0 |
| Testing | Pest PHP | ^4.6 |
| Database | MySQL | — |

---

## 3. Arsitektur Sistem

```
Browser (React + TypeScript)
        │
        │  Inertia.js (SSR / SPA Hybrid)
        ▼
Laravel Application (Monolith)
        │
        ├── Routes (web.php, settings.php)
        ├── Middleware (Auth, HandleInertiaRequests, HandleAppearance)
        ├── Controllers (business logic)
        ├── Models (Eloquent ORM)
        ├── Policies (authorization)
        ├── Form Requests (validation)
        ├── Notifications (database channel)
        └── Exports (PDF via DomPDF, Excel via Maatwebsite)
                │
                ▼
           MySQL Database (pims)
```

**Pola arsitektur:**
- **Monolith Laravel + Inertia.js**: server render data ke React page tanpa API terpisah
- **Role-based access**: admin / manager / driver via Spatie Permission
- **Type-safe frontend**: Wayfinder generate fungsi TypeScript dari backend routes
- **Pessimistic locking**: prevent race condition pada alokasi slot P2H
- **Database-backed**: session, cache, dan queue semuanya di MySQL

---

## 4. Database Schema

### 4.1 Tabel Sistem Laravel

**`users`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| name | string | Nama lengkap |
| nik | string unique | Nomor Induk Karyawan |
| email | string unique | Alamat email |
| email_verified_at | timestamp nullable | Waktu verifikasi |
| password | string | Hash bcrypt |
| two_factor_secret | text nullable | Secret TOTP |
| two_factor_recovery_codes | text nullable | Kode pemulihan JSON |
| two_factor_confirmed_at | datetime nullable | Waktu konfirmasi 2FA |
| remember_token | string nullable | Token remember-me |
| timestamps | — | created_at, updated_at |

**`sessions`** — Sesi login berbasis database

**`cache`** — Cache berbasis database

**`jobs`** — Queue jobs berbasis database

**`password_reset_tokens`** — Token reset password

### 4.2 Tabel Otorisasi (Spatie Permission)

**`roles`** — admin, manager, driver

**`permissions`** — Daftar permission

**`model_has_roles`**, **`model_has_permissions`**, **`role_has_permissions`** — Pivot tables

### 4.3 Tabel Notifikasi

**`notifications`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | — |
| type | string | Class notifikasi |
| notifiable_type | string | Polymorphic type |
| notifiable_id | bigint | ID penerima |
| data | json | Payload notifikasi |
| read_at | timestamp nullable | Waktu dibaca |
| timestamps | — | — |

### 4.4 Tabel Domain Utama

**`units`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| no_unit | string unique | Nomor identifikasi unit |
| jenis_unit | enum | `Bus` / `Light Vehicle` |
| no_lambung | string nullable | Nomor lambung |
| status | enum | `active` / `inactive` (default: active) |
| timestamps | — | — |

**`drivers`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| user_id | FK → users | Akun user terkait |
| nik | string unique | NIK driver |
| nama | string | Nama driver |
| department | string | Departemen |
| jenis_unit | string nullable | Jenis unit yang dioperasikan |
| timestamps | — | — |

**`p2h_inspection_items`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| nama_item | string | Nama item pemeriksaan |
| risiko | enum | `Critical` / `High` / `Medium` / `Low` |
| urutan | integer | Urutan tampil |
| is_active | boolean | Aktif/nonaktif |
| timestamps | — | — |

**`p2h_sessions`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| unit_id | FK → units | Unit yang diperiksa |
| tanggal | date | Tanggal sesi |
| catatan_khusus | text nullable | Catatan tambahan |
| status | enum | `open` / `completed` (default: open) |
| created_by | FK → users | Petugas yang membuat sesi |
| timestamps | — | — |
| UNIQUE | (unit_id, tanggal) | Satu sesi per unit per hari |

**`p2h_user_entries`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| p2h_session_id | FK → p2h_sessions | Sesi terkait |
| user_id | FK → users | Driver yang mengisi |
| user_slot | tinyint | Slot ke-1 s/d 4 |
| km_awal | integer nullable | Odometer awal |
| shift | enum nullable | `Pagi` / `Siang` / `Malam` |
| paraf_url | string nullable | Path file tanda tangan PNG |
| submitted_at | timestamp nullable | Waktu submit |
| kondisi_akhir | enum | `Layak Pakai` / `BD` |
| justifikasi_kondisi | text nullable | Alasan override keputusan |
| timestamps | — | — |
| UNIQUE | (p2h_session_id, user_slot) | Satu entry per slot |

**`p2h_checklist_answers`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| p2h_user_entry_id | FK → p2h_user_entries | Entry terkait |
| inspection_item_id | FK → p2h_inspection_items | Item pemeriksaan |
| kondisi | enum | `Layak` / `Tidak Layak` |
| keterangan | text nullable | Keterangan jika TL |
| timestamps | — | — |

**`p2h_service_info`** *(hanya slot 1)*
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| p2h_session_id | FK → p2h_sessions | Sesi terkait |
| servis_mingguan | boolean nullable | Flag servis mingguan |
| servis_berkala | boolean nullable | Flag servis berkala |
| unschedule_breakdown | boolean nullable | Flag breakdown tak terjadwal |
| lainnya | string nullable | Keterangan lain |
| catatan_servis | text nullable | Catatan servis |
| timestamps | — | — |

**`p2h_fuel_logs`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| p2h_user_entry_id | FK → p2h_user_entries | Entry terkait |
| km_unit | integer nullable | Odometer saat isi BBM |
| jumlah_liter | decimal(10,2) | Jumlah liter BBM |
| timestamps | — | — |

**`unit_downtime_logs`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | — |
| unit_id | FK → units | Unit yang downtime |
| tipe | enum | `BD` / `PM` / `Servis Berkala` |
| jam_mulai | timestamp | Waktu mulai downtime |
| jam_selesai | timestamp nullable | Waktu selesai (null = masih berjalan) |
| keterangan | text nullable | Deskripsi downtime |
| created_by | FK → users | Petugas pencatat |
| timestamps | — | — |
| INDEX | (unit_id, jam_mulai) | Optimasi query range |

### 4.5 Entity Relationship Diagram

```
users ──────────────────── drivers
  │  1:1                      │
  │                           │ (jenis_unit filter)
  │ (created_by)              │
  ▼                           ▼
p2h_sessions ◄── units ──► unit_downtime_logs
  │   1:N          1:N
  │
  ├──► p2h_service_info (1:1, slot 1 only)
  │
  └──► p2h_user_entries (1:N, max 4)
            │
            ├──► p2h_checklist_answers (1:N)
            │         └── p2h_inspection_items (N:1)
            │
            └──► p2h_fuel_logs (1:1)
```

---

## 5. Models & Relasi Eloquent

### `User` (`app/Models/User.php`)
```php
Traits: HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles
Fillable: name, nik, email, password

Relasi:
- driver(): HasOne(Driver)
- roles() — via HasRoles (Spatie)
```

### `Driver` (`app/Models/Driver.php`)
```php
Fillable: user_id, nik, nama, department, jenis_unit

Relasi:
- user(): BelongsTo(User)
```

### `Unit` (`app/Models/Unit.php`)
```php
Fillable: no_unit, jenis_unit, no_lambung, status

Relasi:
- p2hSessions(): HasMany(P2hSession)
- downtimeLogs(): HasMany(UnitDowntimeLog)

Scopes:
- active() — where status = 'active'
```

### `P2hSession` (`app/Models/P2hSession.php`)
```php
Fillable: unit_id, tanggal, catatan_khusus, status, created_by
Casts: tanggal → date

Relasi:
- unit(): BelongsTo(Unit)
- creator(): BelongsTo(User, 'created_by')
- userEntries(): HasMany(P2hUserEntry) — ordered by user_slot
- serviceInfo(): HasOne(P2hServiceInfo)
```

### `P2hUserEntry` (`app/Models/P2hUserEntry.php`)
```php
Fillable: p2h_session_id, user_id, user_slot, km_awal, paraf_url, shift,
          submitted_at, kondisi_akhir, justifikasi_kondisi
Casts: submitted_at → datetime

Relasi:
- session(): BelongsTo(P2hSession)
- user(): BelongsTo(User)
- answers(): HasMany(P2hChecklistAnswer)
- fuelLog(): HasOne(P2hFuelLog)

Attribute Accessors:
- getTidakLayakCountAttribute() — jumlah jawaban "Tidak Layak"
- getIsOverrideAttribute() — true jika kondisi_akhir berbeda dari rekomendasi otomatis
  (Rekomendasi: ≥80% Layak → "Layak Pakai", sisanya → "BD")
```

### `P2hInspectionItem` (`app/Models/P2hInspectionItem.php`)
```php
Fillable: nama_item, risiko, urutan, is_active
Casts: is_active → boolean

Relasi:
- answers(): HasMany(P2hChecklistAnswer)

Scopes:
- active() — where is_active = true
- ordered() — order by urutan ASC
```

### `P2hChecklistAnswer` (`app/Models/P2hChecklistAnswer.php`)
```php
Fillable: p2h_user_entry_id, inspection_item_id, kondisi, keterangan

Relasi:
- userEntry(): BelongsTo(P2hUserEntry)
- inspectionItem(): BelongsTo(P2hInspectionItem)
```

### `P2hServiceInfo` (`app/Models/P2hServiceInfo.php`)
```php
Table: p2h_service_info
Fillable: p2h_session_id, servis_mingguan, servis_berkala,
          unschedule_breakdown, lainnya, catatan_servis
Casts: servis_mingguan, servis_berkala, unschedule_breakdown → boolean

Relasi:
- session(): BelongsTo(P2hSession)
```

### `P2hFuelLog` (`app/Models/P2hFuelLog.php`)
```php
Fillable: p2h_user_entry_id, km_unit, jumlah_liter
Casts: jumlah_liter → decimal:2

Relasi:
- userEntry(): BelongsTo(P2hUserEntry)
```

### `UnitDowntimeLog` (`app/Models/UnitDowntimeLog.php`)
```php
Fillable: unit_id, tipe, jam_mulai, jam_selesai, keterangan, created_by
Casts: jam_mulai, jam_selesai → datetime

Relasi:
- unit(): BelongsTo(Unit)
- creator(): BelongsTo(User, 'created_by')

Attribute Accessors:
- getDurationHoursAttribute() — durasi downtime dalam jam (2 desimal)

Scopes:
- completed() — where jam_selesai IS NOT NULL
- inRange(from, to) — downtime yang overlap dengan rentang tanggal
```

---

## 6. Routes & Controllers

### 6.1 Routes (`routes/web.php`)

```
GET  /                           → Redirect berdasarkan role
                                   driver → /driver/dashboard
                                   lainnya → /dashboard

[Middleware: auth]

GET  /dashboard                  → DashboardController@index           (admin, manager)
GET  /driver/dashboard           → DriverDashboardController@index      (driver)

GET  /p2h                        → P2hSessionController@index           (semua)
GET  /p2h/form                   → P2hSessionController@create          (semua)
POST /p2h                        → P2hSessionController@store           (semua)
GET  /p2h/{session}              → P2hSessionController@show            (semua, via Policy)
DELETE /p2h/{session}            → P2hSessionController@destroy         (admin)
GET  /api/p2h/check-slot         → P2hSessionController@checkSlot       (AJAX, semua)
GET  /p2h/{session}/export-pdf   → P2hExportController@exportPdf        (semua, via Policy)

GET  /monitoring                 → MonitoringController@index           (admin, manager)
GET  /p2h-compliance             → P2hComplianceController@index        (admin, manager)

GET  /downtime                   → UnitDowntimeController@index         (admin, manager)
POST /downtime                   → UnitDowntimeController@store         (admin, manager)
PATCH /downtime/{log}            → UnitDowntimeController@update        (admin, manager)
DELETE /downtime/{log}           → UnitDowntimeController@destroy       (admin, manager)

GET  /units                      → UnitController@index                 (admin, manager)
POST /units                      → UnitController@store                 (admin, manager)
PUT  /units/{unit}               → UnitController@update                (admin, manager)
DELETE /units/{unit}             → UnitController@destroy               (admin, manager)

GET  /users                      → UserController@index                 (admin, manager)
POST /users                      → UserController@store                 (admin, manager)
PUT  /users/{user}               → UserController@update                (admin, manager)
DELETE /users/{user}             → UserController@destroy               (admin, manager)

GET  /notifications              → NotificationController@index         (semua)
PATCH /notifications/{id}/read   → NotificationController@markRead      (semua)
POST /notifications/read-all     → NotificationController@markAllRead   (semua)

GET  /export/monitoring-pa/pdf       → DataExportController@monitoringPaPdf
GET  /export/monitoring-pa/excel     → DataExportController@monitoringPaExcel
GET  /export/monitoring-p2h/pdf      → DataExportController@monitoringP2hPdf
GET  /export/monitoring-p2h/excel    → DataExportController@monitoringP2hExcel
GET  /export/history-p2h/pdf         → DataExportController@historyP2hPdf   (semua)
GET  /export/history-p2h/excel       → DataExportController@historyP2hExcel (semua)

[routes/settings.php]
GET/PUT /settings/profile        → Settings\ProfileController
GET/PUT /settings/security       → Settings\SecurityController
```

### 6.2 Controllers

#### `DashboardController`
Menampilkan dashboard admin/manager dengan:
- Total unit aktif, total P2H hari ini, unit tidak layak, item kritis
- Chart bar P2H count 7 hari terakhir
- 10 sesi P2H terbaru

#### `P2hSessionController`
Controller utama P2H dengan logika bisnis:

| Method | Fungsi |
|---|---|
| `index` | List sesi P2H dengan filter (tanggal, unit, hasil). Driver hanya lihat miliknya. |
| `create` | Tampil form dengan unit aktif & inspection items. Driver difilter per jenis_unit. |
| `store` | Buat/ambil sesi, kunci baris (pessimistic lock), alokasi slot, simpan tanda tangan (base64→PNG), buat entry + jawaban + info servis + log BBM. Alert kritis ke admin. Auto-complete sesi jika 4 slot terisi. |
| `checkSlot` | AJAX: kembalikan slot_terisi, slot_tersedia, next_slot |
| `show` | Tampil detail sesi. Via `P2hSessionPolicy` (admin/manager atau driver yang mengisi). |
| `destroy` | Hapus sesi + tanda tangan dari storage (admin only). |

#### `MonitoringController`
Kalkulasi Physical Availability (PA) per unit:

| Metrik | Formula |
|---|---|
| Compliance PA | % hari dengan status Operational (score checklist ≥80%) |
| Actual PA | Working Hours ÷ (Working Hours + Downtime Hours) × 100% |
| Working Hours | Jumlah shift × 12 jam/shift |
| Downtime Hours | Dari `UnitDowntimeLog` dengan scope `inRange()` & `completed()` |

Output: tabel per unit + timeline sparkline harian + aggregat armada.

#### `P2hComplianceController`
Matriks kepatuhan unit × tanggal (max 31 hari):
- Status per sel: `operation` / `bd` / `no_data`
- Flag override (keputusan manual driver)
- Summary: total sel terisi, terlewat, BD

#### `UnitDowntimeController`
CRUD downtime logs dengan filter (unit, tipe, tanggal, status ongoing/completed).

#### `UserController`
CRUD user dengan:
- Auto-create profil Driver jika role = driver
- Sync role via Spatie
- Prevent self-deletion

#### `DataExportController`
Generate PDF (DomPDF) dan Excel (Maatwebsite) untuk:
- Monitoring PA (fleet availability report)
- Monitoring P2H (compliance report)
- History P2H (per unit/driver)

#### `NotificationController`
List, mark-read, mark-all-read untuk notifikasi database. Deep-link ke sesi P2H terkait.

### 6.3 Form Requests

**`StoreP2hRequest`** (`app/Http/Requests/StoreP2hRequest.php`)
```
- unit_id: required, exists on active units
- km_awal: required, integer, min:0
- shift: required, enum [Shift I, Shift II]
- paraf: required, string (base64 signature)
- answers: required, array, size = jumlah item aktif
  - answers.*.inspection_item_id: required, exists
  - answers.*.kondisi: required, enum [Layak, Tidak Layak]
  - answers.*.keterangan: required if Tidak Layak
- service_info: optional (nullable array)
- fuel_log: optional (nullable array)
- kondisi_akhir: required, enum [Layak Pakai, BD]
- justifikasi_kondisi: required jika isOverrideDecision()
```

---

## 7. Fitur Utama

### 7.1 Formulir P2H

- **Multi-slot**: Hingga 4 driver mengisi entry berbeda untuk satu unit per hari
- **Tanda tangan digital**: Canvas base64 disimpan sebagai file PNG di `public/signatures/`
- **Checklist dinamis**: Berdasarkan `p2h_inspection_items` aktif dengan level risiko
- **Scoring otomatis**: Jika ≥80% item = "Layak" → rekomendasi "Layak Pakai", else "BD"
- **Override keputusan**: Driver bisa override rekomendasi dengan wajib isi justifikasi
- **Info servis**: Hanya slot 1 yang mengisi info servis mingguan/berkala/breakdown
- **Log BBM**: Opsional per entry
- **Auto-complete sesi**: Status sesi menjadi "completed" saat 4 slot terisi
- **Race condition prevention**: Pessimistic lock pada tabel sesi saat alokasi slot

### 7.2 Monitoring PA (Physical Availability)

- Filter: rentang tanggal (max 90 hari), unit, jenis unit
- Per unit: compliance PA, actual PA, working hours, downtime hours, status terkini
- Timeline: sparkline harian dengan skor dan flag override
- Ringkasan armada: rata-rata agregat

### 7.3 Matriks Kepatuhan P2H

- Tampilan grid unit × tanggal (max 31 hari, default 14 hari)
- Warna sel: hijau (operation), merah (BD), abu (no_data)
- Indikator override manual
- Statistik: unit sempurna, total item TL, tingkat kepatuhan

### 7.4 Manajemen Downtime

- Tipe: BD (Breakdown), PM (Preventive Maintenance), Servis Berkala
- Tracking downtime sedang berjalan (jam_selesai = null)
- Kalkulasi durasi otomatis
- Filter dengan logika overlap tanggal

### 7.5 Manajemen User

- CRUD dengan filter (search nama/NIK/email, role)
- Saat membuat driver: otomatis buat profil Driver terhubung ke User
- Statistik distribusi role
- Lindungi dari self-deletion

### 7.6 Notifikasi

- **CriticalItemAlert**: Otomatis kirim ke semua admin jika item risiko "Critical" dijawab "Tidak Layak"
- Penyimpanan: database channel (persistent)
- Tracking read: mark single / mark all
- Deep-link ke sesi P2H terkait

### 7.7 Ekspor Data

| Laporan | PDF | Excel |
|---|---|---|
| Monitoring PA | ✓ | ✓ |
| Monitoring P2H (Compliance) | ✓ | ✓ |
| History P2H | ✓ | ✓ |
| Detail Sesi P2H (per sesi) | ✓ | — |

### 7.8 Autentikasi & Keamanan

- Login menggunakan **NIK** (bukan email)
- Two-Factor Authentication (TOTP) opsional via Google Authenticator
- Rate limiting: 5 percobaan login per menit
- Policy-based authorization (P2hSessionPolicy)
- Role-based middleware per route group

---

## 8. Frontend Architecture

### Struktur `resources/js/`

```
resources/js/
├── app.tsx                    # Entry point Inertia + Toaster + ThemeProvider
├── actions/                   # Wayfinder-generated API layer (type-safe)
├── components/
│   ├── ui/                    # Radix UI component wrappers (button, dialog, table, dll)
│   ├── app-header.tsx         # Header navigasi + NotificationBell + user menu
│   ├── app-sidebar.tsx        # Sidebar kolapsibel dengan nav berbasis role
│   ├── login-form.tsx         # Form autentikasi
│   ├── flash-toast-listener.tsx  # Integrasi toast Sonner dengan Inertia flash
│   ├── two-factor-setup-modal.tsx # Modal setup 2FA
│   └── error-boundary.tsx     # Penanganan error React
├── layouts/
│   ├── app-layout.tsx         # Layout utama (sidebar + header + konten)
│   ├── auth-layout.tsx        # Layout halaman autentikasi
│   └── settings/layout.tsx    # Layout halaman settings
├── pages/
│   ├── auth/                  # login, register, forgot-password, dll
│   ├── dashboard/index.tsx    # Dashboard admin/manager
│   ├── driver-dashboard/index.tsx  # Dashboard driver
│   ├── p2h/
│   │   ├── form.tsx           # Form pengisian P2H (multi-step)
│   │   ├── index.tsx          # Daftar sesi P2H
│   │   ├── show.tsx           # Detail sesi P2H
│   │   └── compliance.tsx     # Matriks kepatuhan
│   ├── monitoring/index.tsx   # PA monitoring + timeline
│   ├── downtime/index.tsx     # Manajemen downtime
│   ├── units/index.tsx        # Manajemen unit
│   ├── users/index.tsx        # Manajemen user
│   ├── drivers/index.tsx      # Manajemen driver
│   ├── notifications/index.tsx # Daftar notifikasi
│   └── settings/              # Profil, keamanan, tampilan
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions
├── types/                     # TypeScript type definitions
└── wayfinder/                 # Metadata route Wayfinder
```

### Komponen Kunci

**Form P2H** (`pages/p2h/form.tsx`)
- Canvas tanda tangan digital
- Checklist item dinamis dengan kondisi + keterangan
- Section info servis (slot 1)
- Log BBM opsional
- Keputusan kondisi akhir + justifikasi override
- Validasi real-time

**Dashboard Monitoring** (`pages/monitoring/index.tsx`)
- Tabel unit dengan metrik PA
- Timeline sparkline per unit
- Kartu ringkasan armada
- Filter tanggal & unit

**Matriks Kepatuhan** (`pages/p2h/compliance.tsx`)
- Grid unit × tanggal
- Sel berwarna berdasarkan status
- Indikator override
- Statistik ringkasan

---

## 9. Konfigurasi Penting

### Authentication (`config/fortify.php`)
```php
'username' => 'nik',          // Login via NIK, bukan email
'features' => [
    Features::resetPasswords(),
    Features::emailVerification(),
    Features::twoFactorAuthentication(['confirm' => true]),
],
```

### Database (`config/database.php` / `.env`)
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pims
DB_USERNAME=root
DB_PASSWORD=
```

### Session, Cache, Queue
```env
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

### File Storage
- Tanda tangan disimpan di `public/signatures/`
- Konfigurasi via `config/filesystems.php` disk `public`

---

## 10. Cara Menjalankan

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 20+
- MySQL

### Setup

```bash
# 1. Clone repository
cd /path/to/project

# 2. Install dependencies
composer install
npm install

# 3. Environment setup
cp .env.example .env
php artisan key:generate

# 4. Konfigurasi database di .env
# DB_DATABASE=pims, DB_USERNAME=root, dll.

# 5. Buat database & jalankan migrasi + seed
php artisan migrate --seed

# 6. Build frontend assets
npm run build

# 7. Jalankan server development
php artisan serve
# Buka browser: http://localhost:8000
```

### Development Mode

```bash
# Terminal 1: Backend
php artisan serve

# Terminal 2: Frontend (Vite HMR)
npm run dev
```

### Regenerate Wayfinder (setelah ubah routes/controllers)

```bash
php artisan wayfinder:generate
```

---

## 11. Test Credentials

| Role | Login (NIK) | Password | Akses |
|---|---|---|---|
| Admin | admin@pims.test | password | Full access, semua fitur |
| Manager | manager@pims.test | password | Monitoring, unit, user (read/write) |
| Driver | driver@pims.test | password | Dashboard driver, isi P2H, notifikasi |

> Login menggunakan NIK atau email (keduanya diterima tergantung konfigurasi Fortify).

---

## 12. Roles & Permission

| Fitur | Admin | Manager | Driver |
|---|---|---|---|
| Dashboard admin | ✓ | ✓ | — |
| Dashboard driver | — | — | ✓ |
| Isi P2H | ✓ | ✓ | ✓ |
| Lihat detail P2H (milik sendiri) | ✓ | ✓ | ✓ |
| Lihat semua P2H | ✓ | ✓ | — |
| Hapus P2H | ✓ | — | — |
| Monitoring PA | ✓ | ✓ | — |
| Matriks kepatuhan | ✓ | ✓ | — |
| Manajemen downtime | ✓ | ✓ | — |
| Manajemen unit | ✓ | ✓ | — |
| Manajemen user | ✓ | ✓ | — |
| Ekspor monitoring | ✓ | ✓ | — |
| Ekspor history P2H | ✓ | ✓ | ✓ |
| Notifikasi kritis | ✓ | — | — |

---

## 13. Struktur Direktori Lengkap

```
PIMS/
├── app/
│   ├── Actions/Fortify/
│   │   ├── CreateNewUser.php
│   │   └── ResetUserPassword.php
│   ├── Concerns/
│   │   ├── PasswordValidationRules.php
│   │   └── ProfileValidationRules.php
│   ├── Exports/
│   │   ├── HistoryP2hExport.php
│   │   ├── MonitoringP2hExport.php
│   │   └── MonitoringPaExport.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php
│   │   │   ├── DashboardController.php
│   │   │   ├── DataExportController.php
│   │   │   ├── DriverController.php
│   │   │   ├── DriverDashboardController.php
│   │   │   ├── MonitoringController.php
│   │   │   ├── NotificationController.php
│   │   │   ├── P2hComplianceController.php
│   │   │   ├── P2hExportController.php
│   │   │   ├── P2hSessionController.php
│   │   │   ├── UnitController.php
│   │   │   ├── UnitDowntimeController.php
│   │   │   ├── UserController.php
│   │   │   └── Settings/
│   │   │       ├── ProfileController.php
│   │   │       └── SecurityController.php
│   │   ├── Middleware/
│   │   │   ├── HandleAppearance.php
│   │   │   └── HandleInertiaRequests.php
│   │   └── Requests/
│   │       ├── StoreP2hRequest.php
│   │       ├── StoreUnitRequest.php
│   │       └── Settings/
│   │           ├── PasswordUpdateRequest.php
│   │           ├── ProfileDeleteRequest.php
│   │           ├── ProfileUpdateRequest.php
│   │           └── TwoFactorAuthenticationRequest.php
│   ├── Models/
│   │   ├── Driver.php
│   │   ├── P2hChecklistAnswer.php
│   │   ├── P2hFuelLog.php
│   │   ├── P2hInspectionItem.php
│   │   ├── P2hServiceInfo.php
│   │   ├── P2hSession.php
│   │   ├── P2hUserEntry.php
│   │   ├── Unit.php
│   │   ├── UnitDowntimeLog.php
│   │   └── User.php
│   ├── Notifications/
│   │   └── CriticalItemAlert.php
│   ├── Policies/
│   │   └── P2hSessionPolicy.php
│   └── Providers/
│       ├── AppServiceProvider.php
│       └── FortifyServiceProvider.php
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── cache.php
│   ├── database.php
│   ├── dompdf.php
│   ├── excel.php
│   ├── filesystems.php
│   ├── fortify.php
│   ├── inertia.php
│   ├── permission.php
│   └── session.php
├── database/
│   ├── factories/
│   │   └── UserFactory.php
│   ├── migrations/              (19 file)
│   └── seeders/
│       └── DatabaseSeeder.php
├── resources/
│   ├── css/app.css
│   ├── js/                      (lihat Section 8)
│   └── views/
│       ├── app.blade.php
│       └── exports/             (Blade templates untuk PDF)
├── routes/
│   ├── web.php
│   ├── settings.php
│   └── console.php
├── tests/
│   ├── Feature/
│   └── Unit/
├── .env
├── artisan
├── composer.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 14. Pola Arsitektur Penting

| Pola | Lokasi | Penjelasan |
|---|---|---|
| Pessimistic locking | `P2hSessionController@store` | `lockForUpdate()` saat alokasi slot untuk mencegah race condition |
| Attribute accessors | `P2hUserEntry`, `UnitDowntimeLog` | Kalkulasi dinamis (is_override, duration_hours) |
| Policy authorization | `P2hSessionPolicy` | Kontrol akses view/delete berdasarkan role & partisipasi |
| Scope queries | `Unit`, `P2hInspectionItem`, `UnitDowntimeLog` | Filter umum (active, ordered, inRange, completed) |
| Inertia flash props | Controller responses | Toast notification via `Inertia::flash()` |
| Wayfinder typing | `resources/js/actions/` | Fungsi TypeScript type-safe dari backend routes |
| Composite unique key | `p2h_sessions`, `p2h_user_entries` | Prevent duplikasi data (unit+tanggal, sesi+slot) |
| Database notifications | `CriticalItemAlert` | Persistent alert untuk admin via Laravel Notifiable |
| Base64 → file storage | `P2hSessionController@store` | Tanda tangan canvas disimpan ke `public/signatures/` |

---

*Dokumentasi dihasilkan: April 2026 | Sistem: PIMS v1.0*
