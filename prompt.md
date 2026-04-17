# Prompt: Bangun Aplikasi Digitalisasi P2H Bus & Light Vehicle "(PIMS) P2H & Inspection Management System"

> **Stack:** Laravel 13 + React (Inertia.js Starter Kit) + MySQL
> **Dokumen Referensi:** WBK-HSE-FO-091 P2H Unit Sarana Bis - LV.xlsx

---

## 1. KONTEKS BISNIS

Saya memiliki formulir fisik P2H (Pemeriksaan & Perawatan Harian) untuk unit kendaraan operasional (Bus dan Light Vehicle) di perusahaan mining. Formulir ini diisi setiap hari oleh driver/operator per shift, mendukung hingga 4 user dalam satu hari (4 shift). Tujuannya adalah mendigitalisasi formulir ini menjadi aplikasi web berbasis mobile-first.

Asumsi awal:
- Codebase Laravel 13 + React (Inertia.js) starter kit sudah ter-install secara fresh
- Database menggunakan MySQL
- Belum ada model, migration, atau halaman apapun selain bawaan starter kit

---

## 2. STRUKTUR DATABASE

Buat migration untuk tabel-tabel berikut:

### Tabel `units`

```
- id               (bigint, PK, auto increment)
- no_unit          (string, unique) — contoh: "LV-001", "BUS-003"
- jenis_unit       (enum: 'Bus', 'Light Vehicle')
- no_lambung       (string, nullable)
- status           (enum: 'active', 'inactive') default: 'active'
- timestamps
```

### Tabel `drivers`

```
- id               (bigint, PK)
- user_id          (FK → users.id, onDelete cascade)
- nik              (string, unique)
- nama             (string)
- department       (string)
- timestamps
```

### Tabel `p2h_inspection_items`

Master data item yang diperiksa. Diisi via seeder, tidak perlu CRUD dari UI.

```
- id               (bigint, PK)
- nama_item        (string)
- risiko           (enum: 'Critical', 'Tinggi', 'Sedang', 'Rendah')
- urutan           (integer) — urutan tampil di form
- is_active        (boolean) default: true
- timestamps
```

**Seed 30 item berikut secara berurutan:**

| Urutan | Nama Item                             | Risiko   |
|--------|---------------------------------------|----------|
| 1      | Kondisi Steering / Kemudi             | Critical |
| 2      | Tyre / Ban                            | Tinggi   |
| 3      | Ban Cadangan                          | Sedang   |
| 4      | Tekanan Ban                           | Sedang   |
| 5      | Jumlah & Kekencangan Baut Roda        | Tinggi   |
| 6      | Kaca depan/samping/belakang           | Sedang   |
| 7      | Kaca Spion                            | Sedang   |
| 8      | Lampu Atas/depan/Belakang             | Sedang   |
| 9      | Lampu Bahaya                          | Sedang   |
| 10     | Lampu Sign Kanan/kiri                 | Sedang   |
| 11     | Alarm Mundur                          | Sedang   |
| 12     | Speedometer                           | Rendah   |
| 13     | Level oil mesin                       | Sedang   |
| 14     | Level oil brake / rem                 | Critical |
| 15     | Level air radiator                    | Sedang   |
| 16     | Level air accu                        | Sedang   |
| 17     | Tuas / Handle transmisi               | Sedang   |
| 18     | Rem tangan / kaki                     | Critical |
| 19     | Washer / air wiper                    | Sedang   |
| 20     | Klakson                               | Sedang   |
| 21     | Sabuk pengaman depan/kabin            | Critical |
| 22     | Tanda Bahaya segitiga                 | Rendah   |
| 23     | APAR                                  | Sedang   |
| 24     | Kunci roda                            | Rendah   |
| 25     | Jack / Dongkrak                       | Sedang   |
| 26     | Rotary / Flash Light                  | Sedang   |
| 27     | No lambung unit                       | Rendah   |
| 28     | Radio Komunikasi                      | Sedang   |
| 29     | Buggy Whip / Bendera (min 4 mtr)      | Sedang   |
| 30     | Four wheel Drive (Double Gardan)      | Sedang   |

### Tabel `p2h_sessions`

Satu sesi P2H = satu hari untuk satu unit. Berisi data header formulir.

```
- id               (bigint, PK)
- unit_id          (FK → units.id)
- tanggal          (date)
- catatan_khusus   (text, nullable)
- status           (enum: 'open', 'completed') default: 'open'
- created_by       (FK → users.id)
- timestamps

UNIQUE constraint: (unit_id, tanggal)
```

### Tabel `p2h_user_entries`

Setiap user/shift mengisi satu entry dalam satu sesi.

```
- id                  (bigint, PK)
- p2h_session_id      (FK → p2h_sessions.id, onDelete cascade)
- user_id             (FK → users.id)
- user_slot           (tinyint) — urutan slot: 1, 2, 3, atau 4
- km_awal             (integer, nullable)
- paraf_url           (string, nullable) — path file tanda tangan digital
- shift               (enum: 'Pagi', 'Siang', 'Malam') nullable
- submitted_at        (timestamp, nullable)
- timestamps

UNIQUE constraint: (p2h_session_id, user_slot)
```

### Tabel `p2h_checklist_answers`

Jawaban per item untuk setiap user entry.

```
- id                      (bigint, PK)
- p2h_user_entry_id       (FK → p2h_user_entries.id, onDelete cascade)
- inspection_item_id      (FK → p2h_inspection_items.id)
- kondisi                 (enum: 'Layak', 'Tidak Layak')
- keterangan              (string, nullable) — wajib diisi jika kondisi = 'Tidak Layak'
- timestamps
```

### Tabel `p2h_service_info`

Info servis per sesi P2H (satu record per sesi).

```
- id                      (bigint, PK)
- p2h_session_id          (FK → p2h_sessions.id, unique, onDelete cascade)
- servis_mingguan         (boolean) default: false
- servis_berkala          (boolean) default: false
- unschedule_breakdown    (boolean) default: false
- lainnya                 (string, nullable)
- catatan_servis          (text, nullable)
- timestamps
```

### Tabel `p2h_fuel_logs`

Log pengisian bahan bakar per user entry.

```
- id                      (bigint, PK)
- p2h_user_entry_id       (FK → p2h_user_entries.id, onDelete cascade)
- km_unit                 (integer, nullable)
- jumlah_liter            (decimal 8,2, nullable)
- timestamps
```

---

## 3. ROLES & PERMISSIONS

Install dan konfigurasi **Spatie Laravel Permission**. Buat 3 roles:

| Role      | Hak Akses                                                                       |
|-----------|---------------------------------------------------------------------------------|
| `driver`  | Mengisi form P2H, lihat riwayat P2H milik sendiri                               |
| `admin`   | Semua akses driver + CRUD unit & driver, lihat semua P2H, export laporan        |
| `manager` | Semua akses read-only + dashboard statistik + export laporan                    |

Buat `RoleSeeder.php` yang membuat ketiga role ini dan membuat satu user default untuk masing-masing role (untuk keperluan testing).

---

## 4. FITUR YANG HARUS DIBANGUN

### A. Authentication

- Gunakan Laravel Breeze yang sudah ter-install
- Login dengan email + password
- Setelah login, redirect berdasarkan role:
  - `driver` → halaman form P2H (`/p2h/form`)
  - `admin` / `manager` → halaman dashboard (`/dashboard`)
- Proteksi semua route dengan middleware `auth`
- Proteksi route admin dengan middleware `role:admin`

---

### B. Master Data (Admin Only)

**Manajemen Unit (`/units`)**
- Tabel list semua unit dengan kolom: No. Unit, Jenis Unit, No. Lambung, Status
- Fitur: search by no. unit, filter by jenis unit dan status
- CRUD: tambah, edit, hapus unit
- Soft delete (nonaktifkan) bukan hard delete

**Manajemen Driver (`/drivers`)**
- Tabel list user dengan role driver
- Kolom: Nama, NIK, Department, Email, Aksi
- Fitur: tambah user baru (sekaligus assign role driver), edit data driver

---

### C. Form P2H — Fitur Inti (Mobile First)

**Alur Pengisian:**

1. Driver pilih unit dari dropdown (hanya unit dengan status `active`)
2. Sistem cek via AJAX: apakah sudah ada `p2h_session` hari ini untuk unit tersebut?
   - Belum ada → buat session baru, buat `p2h_user_entry` slot 1
   - Sudah ada, slot < 4 → tambah entry baru di slot berikutnya
   - Slot sudah penuh (4/4) → tampilkan pesan error, form tidak bisa dilanjutkan
3. Driver mengisi form dengan section berikut:

**Section 1 — Header**
- Nama Driver: auto-fill dari user yang login (read-only)
- NIK: auto-fill dari data driver (read-only)
- KM Awal: input angka (required)
- Shift: dropdown Pagi / Siang / Malam (required)

**Section 2 — Checklist 30 Item**
- Tampilkan semua item berurutan sesuai field `urutan`
- Setiap item menampilkan:
  - Nama item
  - Badge risiko dengan warna: Critical = merah, Tinggi = oranye, Sedang = kuning, Rendah = abu-abu
  - Toggle button: **LAYAK** (hijau) / **TIDAK LAYAK** (merah) — default tidak ada pilihan
  - Jika pilih **TIDAK LAYAK**: muncul input textarea keterangan (required, tidak bisa dikosongkan)
- Item dengan risiko **Critical** diberi border/highlight merah agar mudah dikenali
- Semua 30 item wajib diisi sebelum bisa submit

**Section 3 — Informasi Servis**
- Checkbox: Servis Mingguan, Servis Berkala, Unschedule Service (Break Down), Lainnya
- Jika "Lainnya" dicentang: muncul input text
- Textarea: Catatan Servis

**Section 4 — Pengisian Bahan Bakar**
- Input: KM Unit (integer)
- Input: Jumlah Liter (decimal)

**Section 5 — Tanda Tangan Digital**
- Canvas signature pad menggunakan library `react-signature-canvas`
- Tombol "Hapus" untuk reset tanda tangan
- Tanda tangan wajib diisi sebelum submit

**Tombol Submit:**
- Validasi client-side: semua item checklist harus dipilih, keterangan wajib ada untuk item Tidak Layak, KM Awal wajib diisi, paraf wajib dibuat
- Saat submit: konversi canvas signature ke base64 PNG, upload ke `storage/app/public/signatures/`, simpan path relatifnya
- Tampilkan loading state saat proses submit
- Setelah berhasil: redirect ke halaman detail P2H session dengan pesan sukses

**UI/UX Requirements:**
- Layout single column, font minimum 16px pada form elements
- Sticky header menampilkan No. Unit yang sedang diisi + nomor slot (contoh: "LV-001 — User #2")
- Progress bar di bawah header: menampilkan persentase item checklist yang sudah diisi
- Touch-friendly: toggle button berukuran minimal 44x44px

---

### D. Dashboard & Riwayat

**Dashboard (`/dashboard`) — Admin & Manager:**
- Metric cards (4 kartu):
  - Total unit aktif
  - Total P2H hari ini
  - Unit dengan item Tidak Layak hari ini
  - Total item Critical Tidak Layak hari ini
- Bar chart: jumlah P2H per hari, 7 hari terakhir — gunakan library **Recharts**
- Tabel "P2H Terbaru": 10 record terbaru dengan kolom No. Unit, Tanggal, Driver (slot 1), Total Item Tidak Layak, Status
- Klik baris tabel → halaman detail P2H session

**Riwayat P2H (`/p2h`) — Semua Role:**
- Tabel dengan filter:
  - Range tanggal (date picker dari-sampai)
  - No. Unit (dropdown atau text search)
  - Jenis Unit (Bus / Light Vehicle)
  - Hasil (Ada Item Tidak Layak / Semua Layak)
- Pagination 15 record per halaman
- Kolom: Tanggal, No. Unit, Jenis Unit, Jumlah User (dari berapa slot yang terisi), Jumlah Item TL, Aksi (Lihat Detail, Export PDF)
- Driver hanya melihat P2H yang pernah ia isi

**Detail P2H Session (`/p2h/{session}`):**
- Header: No. Unit, Jenis Unit, Tanggal, Total Slot Terisi
- Tab navigasi: User #1, User #2, User #3, User #4 (tab disable jika slot belum diisi)
- Setiap tab menampilkan:
  - Info driver: Nama, NIK, Department, Shift, KM Awal
  - Tabel checklist: Nama Item, Risiko, Kondisi (Layak/TL), Keterangan
  - Item Tidak Layak diberi background merah muda
  - Section Informasi Servis
  - Section BBM
  - Gambar tanda tangan
- Tombol **Export PDF** di pojok kanan atas

---

### E. Export PDF

Generate PDF dengan layout yang **semirip mungkin dengan formulir fisik WBK-HSE-FO-091**.

Gunakan package **barryvdh/laravel-dompdf**.

Struktur PDF (`resources/views/pdf/p2h_report.blade.php`):

1. **Header**: Logo WBK (jika ada), judul "FORMULIR PEMERIKSAAN & PERAWATAN HARIAN (P2H) UNIT SARANA – BUS / LIGHT VEHICLE", No. Dokumen, Tgl Terbit, Revisi
2. **Blok Info Unit**: Hari/Tanggal, No. Unit, User Dept, Jenis Unit
3. **Blok Info 4 User**: Nama Driver, NIK, KM Awal, Paraf (render image signature) — layout 4 kolom
4. **Tabel Checklist**: Kolom — No, Item Periksa, Risiko, USER #1 (Layak/TDK), USER #2, USER #3, USER #4, Keterangan
5. **Section Informasi Servis**: Checkbox hasil + Catatan Servis
6. **Section Pengisian BBM**: KM Unit, Shift, User, Paraf
7. **Kesimpulan**: LAYAK / TIDAK LAYAK per user slot
8. **Catatan Khusus**

Route: `GET /p2h/{session}/export-pdf` → return PDF download dengan nama file `P2H_{no_unit}_{tanggal}.pdf`

---

### F. Sistem Notifikasi Alert

**Trigger:** Setiap kali P2H di-submit dan terdapat minimal satu item dengan risiko **Critical** ber-kondisi **Tidak Layak**.

**Aksi:**
- Buat notifikasi Laravel (database notification) untuk semua user dengan role `admin`
- Isi notifikasi:
  - No. Unit
  - Nama driver yang mengisi
  - Daftar item Critical yang Tidak Layak (beserta keterangannya)
  - Waktu submit

**UI Notifikasi:**
- Icon lonceng di navbar dengan badge merah berisi jumlah notifikasi yang belum dibaca
- Klik lonceng → dropdown preview 5 notifikasi terbaru
- Halaman `/notifications`: list semua notifikasi dengan status Dibaca/Belum Dibaca
- Klik satu notifikasi → tandai sebagai dibaca + redirect ke halaman detail P2H terkait

---

## 5. STRUKTUR FILE

### Backend (Laravel)

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── DashboardController.php
│   │   ├── UnitController.php
│   │   ├── DriverController.php
│   │   ├── P2hSessionController.php
│   │   ├── P2hUserEntryController.php
│   │   ├── P2hExportController.php
│   │   └── NotificationController.php
│   └── Requests/
│       ├── StoreUnitRequest.php
│       └── StoreP2hRequest.php
├── Models/
│   ├── Unit.php
│   ├── Driver.php
│   ├── P2hInspectionItem.php
│   ├── P2hSession.php
│   ├── P2hUserEntry.php
│   ├── P2hChecklistAnswer.php
│   ├── P2hServiceInfo.php
│   └── P2hFuelLog.php
├── Notifications/
│   └── CriticalItemAlert.php
└── Policies/
    └── P2hSessionPolicy.php

database/
├── migrations/
│   ├── xxxx_create_units_table.php
│   ├── xxxx_create_drivers_table.php
│   ├── xxxx_create_p2h_inspection_items_table.php
│   ├── xxxx_create_p2h_sessions_table.php
│   ├── xxxx_create_p2h_user_entries_table.php
│   ├── xxxx_create_p2h_checklist_answers_table.php
│   ├── xxxx_create_p2h_service_info_table.php
│   └── xxxx_create_p2h_fuel_logs_table.php
└── seeders/
    ├── RoleSeeder.php
    ├── InspectionItemSeeder.php
    └── DatabaseSeeder.php

resources/views/pdf/
└── p2h_report.blade.php
```

### Frontend (React + Inertia)

```
resources/js/
├── Pages/
│   ├── Dashboard/
│   │   └── Index.jsx
│   ├── P2h/
│   │   ├── Form.jsx          — form pengisian P2H (mobile-first)
│   │   ├── Index.jsx         — riwayat / list P2H
│   │   └── Show.jsx          — detail P2H session
│   ├── Units/
│   │   ├── Index.jsx
│   │   └── Form.jsx
│   ├── Drivers/
│   │   └── Index.jsx
│   └── Notifications/
│       └── Index.jsx
└── Components/
    ├── P2h/
    │   ├── ChecklistItem.jsx  — satu item checklist + toggle
    │   ├── SignaturePad.jsx   — canvas tanda tangan
    │   ├── RiskBadge.jsx      — badge risiko berwarna
    │   └── ProgressBar.jsx    — progress pengisian checklist
    └── Layout/
        └── NotificationBell.jsx
```

---

## 6. ROUTES

```php
// routes/web.php

Route::middleware(['auth'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // P2H
    Route::get('/p2h', [P2hSessionController::class, 'index'])->name('p2h.index');
    Route::get('/p2h/form', [P2hSessionController::class, 'create'])->name('p2h.create');
    Route::post('/p2h', [P2hSessionController::class, 'store'])->name('p2h.store');
    Route::get('/p2h/{session}', [P2hSessionController::class, 'show'])->name('p2h.show');
    Route::get('/p2h/{session}/export-pdf', [P2hExportController::class, 'exportPdf'])->name('p2h.export-pdf');

    // AJAX — cek slot unit hari ini
    Route::get('/api/p2h/check-slot', [P2hSessionController::class, 'checkSlot'])->name('p2h.check-slot');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Admin only
    Route::middleware(['role:admin'])->group(function () {
        Route::resource('units', UnitController::class);
        Route::resource('drivers', DriverController::class)->only(['index', 'create', 'store', 'edit', 'update']);
    });
});
```

---

## 7. VALIDASI SERVER-SIDE

Di `StoreP2hRequest.php`, terapkan rules berikut:

```php
'unit_id'                   => 'required|exists:units,id|status:active',
'km_awal'                   => 'required|integer|min:0',
'shift'                     => 'required|in:Pagi,Siang,Malam',
'paraf'                     => 'required|string', // base64 image
'answers'                   => 'required|array|size:30',
'answers.*.inspection_item_id' => 'required|exists:p2h_inspection_items,id',
'answers.*.kondisi'         => 'required|in:Layak,Tidak Layak',
'answers.*.keterangan'      => 'required_if:answers.*.kondisi,Tidak Layak|nullable|string',
'service_info'              => 'nullable|array',
'fuel_log.km_unit'          => 'nullable|integer|min:0',
'fuel_log.jumlah_liter'     => 'nullable|numeric|min:0',
```

Tambahan logic di controller sebelum menyimpan:
1. Cek apakah `unit_id` + tanggal hari ini sudah memiliki 4 user entries → return 422 jika penuh
2. Setelah data tersimpan, jalankan pengecekan item Critical Tidak Layak → dispatch notifikasi jika ada

---

## 8. PACKAGES YANG PERLU DIINSTALL

```bash
# Backend
composer require spatie/laravel-permission
composer require barryvdh/laravel-dompdf

# Frontend
npm install react-signature-canvas
npm install recharts
npm install @headlessui/react
npm install date-fns
```

---

## 9. CATATAN IMPLEMENTASI PENTING

1. **Signature Pad**: Gunakan `react-signature-canvas`. Saat submit, konversi canvas ke base64 PNG via `toDataURL('image/png')`, kirim sebagai string di payload. Di server, decode base64 dan simpan ke `storage/app/public/signatures/{uuid}.png`. Jalankan `php artisan storage:link` agar accessible via URL publik.

2. **Inertia Props**: Semua data dikirim via Inertia props dari controller. Tidak perlu membuat REST API endpoint terpisah, kecuali untuk pengecekan slot unit (AJAX ringan tanpa full page reload).

3. **Mobile First**: Form P2H harus nyaman digunakan di smartphone. Gunakan padding minimal `p-4`, font minimum 16px, dan toggle button minimal 44×44px agar mudah di-tap.

4. **PDF Layout**: Template blade untuk DomPDF harus menggunakan inline CSS (DomPDF tidak mendukung Tailwind). Buat tabel dengan border collapse untuk layout checklist 4 kolom user. Gunakan `@page { size: A4 portrait; }` di style.

5. **Optimistic UI**: Pada toggle LAYAK/TIDAK LAYAK di form checklist, update state React secara langsung tanpa menunggu server response. Progress bar harus ter-update real-time setiap kali satu item dipilih.

6. **Constraint Unik Session**: Karena `p2h_sessions` memiliki unique constraint `(unit_id, tanggal)`, gunakan `firstOrCreate` di controller untuk menghindari duplicate error saat race condition.

7. **Authorization**: Gunakan Laravel Policy (`P2hSessionPolicy`) untuk memastikan driver hanya bisa melihat P2H yang pernah ia isi. Admin dan manager dapat melihat semua.

---

## 10. URUTAN PENGERJAAN (REKOMENDASI)

Kerjakan secara berurutan:

1. **Migration** — buat semua tabel sesuai struktur di atas
2. **Seeder** — `RoleSeeder` (roles + user testing) dan `InspectionItemSeeder` (30 item P2H)
3. **Models** — buat semua model dengan relasi Eloquent yang lengkap (hasMany, belongsTo, dst.)
4. **Auth & Middleware** — konfigurasi Spatie Permission, tambahkan redirect berdasarkan role setelah login
5. **Form P2H** — halaman inti aplikasi, kerjakan mobile-first
6. **Dashboard & Riwayat** — setelah form bisa menyimpan data
7. **Master Data** — CRUD Unit dan Driver
8. **Export PDF** — template blade + DomPDF
9. **Sistem Notifikasi** — database notification + UI bell icon
10. **Testing & Polish** — validasi semua alur, responsivitas, dan edge case


## 11. RULES

Setiap codebase yang akan ditulis harus divalidasi terlebih dahulu menggunakan context7 mcp server (use context7) dan semua component yang akan digunakan untuk membangun front end harus menggunakan component ShadCN UI.
---

*Dokumen ini dibuat berdasarkan formulir fisik WBK-HSE-FO-091 milik PT. Wahana Bandhawa Kencana.*
