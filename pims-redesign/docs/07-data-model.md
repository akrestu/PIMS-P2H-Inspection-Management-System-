# 07 · Model data

Konvensi: Laravel, `id` bigint, `timestamps`, `softDeletes` untuk entitas yang punya Sampah (`deleted_at` + `deleted_by` + `delete_reason`). Waktu disimpan **UTC**, ditampilkan di zona waktu site. Angka HM/KM `decimal(10,1)`.

## Enum
| Enum | Nilai |
|---|---|
| `Role` | `driver`, `manager`, `admin` |
| `UnitStatus` | `ready`, `bd`, `pm`, `servis` |
| `ItemResult` | `baik`, `rusak` |
| `P2hResult` | `layak`, `tidak_layak` |
| `ApprovalStatus` | `menunggu`, `eskalasi`, `disetujui`, `ditolak` |
| `FindingStatus` | `open`, `closed` |
| `DowntimeSource` | `p2h_otomatis`, `manual` |
| `FuelLevel` | `kosong`, `1/4`, `1/2`, `3/4`, `penuh` |
| `Timezone` | `Asia/Jakarta` (WIB), `Asia/Makassar` (WITA), `Asia/Jayapura` (WIT) |
| `ComplianceCell` | `ok` (tepat waktu), `late`, `miss`, `off` (tidak wajib: BD/PM/Servis sepanjang shift) |

## Tabel

### sites
`id, code (char3, unik, uppercase), name, timezone, default_approver_id → users (nullable), public_token (char 4–12), public_token_created_at, public_token_created_by, public_enabled bool, softDeletes`

### users
`id, name, role, nrp (char8, **wajib & unik untuk semua peran** — dipakai login), email (nullable, unik; untuk reset & notifikasi, wajib Manager/Admin), phone_wa, password (hash, min 8), two_factor_* (Fortify), is_active bool, last_login_at, deletion_requested_at, deletion_reason, softDeletes`
Pivot **site_user**: `site_id, user_id, is_lv_approver bool`.

### unit_types / checklist_templates
`checklist_templates: id, name ('Dump Truck', 'Excavator', 'Light Vehicle', 'Water Truck', 'Motor Grader', 'Dozer')`
`checklist_items: id, template_id, category, code, name, hint, is_critical, sort`
Default 18 item untuk semua template — lihat `data/checklist-items.json`.

### units
`id, code (unik, mis. DT-1045), type ('Dump Truck'…), model ('HD 90 t'), site_id, checklist_template_id, hm_current, km_current (nullable), status UnitStatus, status_since, lv_approver_id (nullable, utk LV), assigned_driver_id (nullable, per shift lihat assignments), softDeletes`

### shift_assignments (opsional, untuk "Unit hari ini")
`id, date, shift_no, unit_id, driver_id`

### p2h_sessions — satu unit per shift
`id, site_id, unit_id, date (tanggal operasional di tz site), shift_no, result P2hResult (agregat: tidak_layak bila ada entry tidak_layak), first_submitted_at, is_late bool, softDeletes`
Unik: `(unit_id, date, shift_no)` di antara yang tidak terhapus.

### p2h_entries — satu per driver dalam sesi
`id, session_id, driver_id, submitted_at, client_uuid (unik, utk idempotensi offline), hm_start, km_start, hm_end (nullable, diisi akhir shift), fuel_level, refuel_liters (nullable), had_service bool, service_note, result P2hResult, driver_signature_path, signed_at, gps_lat, gps_lng, device_info, approval_status ApprovalStatus, approved_by, approved_at, approver_signature_path, rejected_reason, escalated_at, softDeletes`

### p2h_answers
`id, entry_id, checklist_item_id, result ItemResult, note (wajib bila rusak), photo_path (wajib bila rusak & kritis; opsional non-kritis)`

### p2h_photos — lampiran wajib
`id, entry_id, kind ('depan'|'hm'|'item'), path, size_kb, taken_at`

### findings (temuan)
`id, code (T-0231, berurutan per site), site_id, unit_id, entry_id (nullable bila manual), checklist_item_id, title, note, is_critical, pic_name / pic_team (PJ), due_at, status FindingStatus, closed_at, closed_by, close_note, close_photo_path, ai_suggestion (text, nullable), ai_generated_at`

### downtimes
`id, unit_id, status (bd|pm|servis), started_at, ended_at (nullable = berlangsung), source DowntimeSource, finding_id (nullable), note, created_by`

### notifications (Laravel database notifications) + notification_preferences
`notification_preferences: user_id, type ('eskalasi'|'kritis'|'persetujuan'|'temuan_overdue'|'pengingat_p2h'|'hasil_persetujuan'), push bool, whatsapp bool, email bool`

### audit_logs (append-only)
`id (tampil sebagai AL-xxxxx), occurred_at, actor_id (nullable = Sistem), action ('buat'|'ubah'|'hapus'|'login'|'otomatis'), verb (teks: "menyetujui P2H"), subject_type, subject_id, subject_label (mis. "DT-1022"), module ('Persetujuan', 'Master unit', …), changes json [{field, before, after}], context json {ip, device, trigger, file…}, site_id`
Gunakan package (mis. `spatie/laravel-activitylog`) atau observer sendiri; pastikan tidak ada update/delete.

### settings (key-value per aplikasi)
`shifts_per_day (1|2|3), shift1_start ('06:00'), p2h_deadline_minutes (30), notify_* bool, ai_* bool, retention_months (24), photo_archive_months (6)`

### daily_summaries (cache ringkasan & AI)
`id, site_id, date, shift_no (nullable), metrics json, ai_text, ai_generated_at, sent_at`

## Turunan (dihitung, bukan disimpan — boleh di-cache)
- **Kepatuhan** per unit per hari: `ComplianceCell` (lihat `08`).
- **PA** per unit per hari: `(1440 − menit downtime di hari itu) / 1440 × 100`.
- **MTTR** temuan/downtime: rata-rata (closed_at − created_at).

## Data contoh
`data/*.json` berisi site, user, unit, item checklist, sesi P2H, temuan, downtime, notifikasi, audit log — konsisten dengan prototype. Pakai untuk seeder (`DatabaseSeeder`) dan Storybook/dev page.
