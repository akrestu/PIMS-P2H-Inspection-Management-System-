# Layar · Data master, Admin, Akun

## Master unit (`/master/unit`)
Gambar: `MasterUnit.png`, `MasterUnit-Desktop.png`. Prototype tweak `peran`.
- Tab **Aktif · n / Sampah · n**. Cari (kode, jenis, site), chip status (Semua/Ready/BD/PM/Servis).
- Tabel: ☐ · Kode · Jenis/model · Site · HM (kanan, `12.481,0`) · Status pill · Checklist (template) · Approver LV · "Ubah" / "Pulihkan" (Sampah: kolom status = "Dihapus 12 Okt").
- Header: "Import" · "Export" · "Tambah unit".
- **Drawer form**: Kode unit (unik, uppercase), Jenis, Merek/model, Site, HM saat ini, Status (segmented Ready/BD/PM/Servis — perubahan → "Perubahan status dicatat sebagai periode downtime mulai sekarang."), Tipe checklist P2H, Approver LV (opsional, LV saja). Edit: "Pindahkan ke Sampah".
- **Import**: drawer — "Unduh template (.xlsx)", dropzone ("Seret file ke sini" / "Lepaskan untuk mengunggah", ".xlsx · maks 5 MB · 1.000 baris", "Pilih file"), progres "Memvalidasi… n%", hasil "10 valid · 2 error" + tabel Baris/Kode/Hasil (error merah), "Impor 10 baris valid", "Unduh baris error untuk diperbaiki".
- Bulk Aktif: Export, Pindah ke Sampah. Bulk Sampah: Pulihkan, Hapus permanen (Admin, ketik HAPUS). Info "Item di Sampah terhapus permanen otomatis setelah 30 hari."
- Mobile: kartu + long-press massal + sheet form; Manager hanya site sendiri, "Hapus permanen hanya oleh Admin."

## Master site (`/master/site`)
Gambar: `MasterSite.png`. Pola sama dengan unit.
- Kartu/baris: kode 3 huruf (mono chip) · nama · zona waktu pill · "48 unit · 58 driver · Approver Hendra W.".
- Form: Nama site (wajib), Kode (3 huruf, unik, "Kode PTA sudah dipakai"), Approver default, **Zona waktu** segmented WIB UTC+7 / WITA UTC+8 / WIT UTC+9 ("Batas shift, tenggat P2H, dan ringkasan harian mengikuti zona ini."). Edit: tautan jumlah unit/driver → daftar terfilter; "Pindahkan ke Sampah" → dialog dengan jumlah unit/driver terdampak (lihat `08#7`).
- Sampah: Pulihkan / Hapus permanen. Manager: baca saja ("Hanya Admin yang dapat menambah atau mengubah site.").

## Pengguna & driver (`/pengguna`)
Gambar: `Pengguna.png`, `Pengguna-Desktop.png`.
- Tab Semua/Admin/Manager/Driver (hitungan), cari (nama, NRP, email), "Tampilkan nonaktif".
- Tabel: ☐ · Nama (avatar + NRP/email) · Peran (Admin = pill hitam) + "Approver LV" (tooltip "Bisa menyetujui P2H Light Vehicle di {site} · eskalasi setelah 15 mnt") · Site · Login terakhir · P2H 30 hari (`29/30`, driver) · Status (Aktif/Nonaktif) · Ubah. Baris nonaktif opacity .6.
- Manager: baris Admin/Manager terkunci (checkbox nonaktif, "Ubah" abu + tooltip "Hanya Admin yang dapat mengubah akun Manager"); sub header "Anda hanya dapat mengelola driver".
- Header: "Import driver" · "Undang pengguna".
- **Drawer Undang/Ubah**: Peran segmented (Admin/Manager/Driver; Manager hanya Driver) + deskripsi peran; Semua peran: Nama, **NRP (8 digit, wajib, unik — dipakai login)**; Driver: Nomor WhatsApp (`08…`/`+62…`), email opsional; Manager/Admin: Email kantor (wajib). Info: "Pengguna masuk dengan NRP dan kata sandi. Tautan aktivasi dikirim ke WhatsApp/email."; Site (chip multi, min 1); Manager: switch "Approver Light Vehicle". Tombol "Kirim undangan"/"Simpan".
- Bulk: Kirim reset kata sandi, Nonaktifkan/Aktifkan, Pindah ke Sampah.
- Pengajuan hapus akun tampil sebagai banner/notifikasi Admin dengan Setujui/Tolak.

## Audit log (`/admin/audit`) — Admin
Gambar: `AuditLog.png`, `AuditLog-Desktop.png` (Manager → 403).
- Sub: "Semua perubahan data tercatat dan tidak bisa diedit · disimpan 2 tahun". Rentang Hari ini/7 hari/30 hari, "Export CSV".
- Filter: cari (objek / ID log), select Pengguna, chip aksi Semua/Buat/Ubah/Hapus/Login/Otomatis.
- Tabel: Waktu (sort) · Pengguna (avatar, tooltip nama lengkap & peran; Sistem = avatar hitam) · Aksi tag (Buat success, Ubah info, Hapus danger, Login netral, Otomatis warning) · Deskripsi (verb + **objek**) · Modul · Sumber (IP mono / "sistem") · Detail.
- **Drawer**: judul kalimat ("Rina A. menghapus permanen 2 unit"), meta (waktu WITA · modul · AL-id), tabel **Perubahan** Field / Sebelum (merah coret) / Sesudah (hijau), **Konteks** (IP, perangkat, file, pemicu, ID log). "Salin ID log", "Lihat semua log {objek}".
- 403 untuk Manager: "403 · Akses ditolak", "Audit log hanya untuk Admin", penjelasan, "Kembali ke Dashboard", "Minta ekspor ke Admin".

## Pengaturan (`/admin/pengaturan`) — Admin
Gambar: `Pengaturan.png`, `Pengaturan-Desktop.png`. Desktop: nav seksi kiri (anchor) + kolom 720.
- **Shift kerja**: segmented 1/2/3 shift; Shift 1 jam mulai (time), shift lain dihitung otomatis.
- **Batas pengisian P2H**: stepper −/+ 5 menit (10–90), penjelasan Terlambat/Tidak P2H.
- **Pengingat & notifikasi** (switch): Pengingat belum P2H · Eskalasi persetujuan (15 mnt) · Item kritis rusak (terkunci "Selalu aktif — keselamatan") · Ringkasan temuan lewat tenggat (07:00) · Hasil persetujuan ke driver.
- **Tautan rekap publik**: switch aktif, URL (mono, coret bila nonaktif), Salin/Lihat, meta "Dibuat 15 Okt 09:15 oleh Rina A.", "Buat ulang token" → dialog peringatan.
- **AI & analitik** (switch): Ringkasan AI harian & periode · Saran perbaikan AI di temuan · Sertakan ringkasan AI di teks WhatsApp; info retensi.
- Bar sticky "Perubahan belum disimpan" (Batalkan / Simpan) hanya bila ada perubahan; tersimpan → toast + audit.

## Akun saya (`/akun`)
Gambar: `Akun.png` (driver), `Akun-Desktop.png` (Manager).
- Header avatar 56 + nama + "Manager · Pit A · email".
- **Profil** (read-only, "Nama, peran, dan site diatur oleh Admin.").
- **Keamanan**: Kata sandi "Diubah 3 bulan lalu" → form inline 3 field + meter kekuatan + validasi; **Verifikasi 2 langkah** (status; Aktifkan → QR + kunci manual + kode 6 digit; Admin wajib); **Sesi aktif** (perangkat, lokasi/IP, waktu; "Sesi ini"; "Keluarkan" / "Keluarkan semua sesi lain").
- **Tampilan**: pilihan kartu Terang / Gelap / Kontras tinggi / Ikuti sistem (berlaku langsung, simpan per perangkat).
- **Hapus akun**: "Ajukan hapus akun" → dialog (penjelasan anonimisasi + alasan opsional) → status "Penghapusan akun diajukan · Menunggu persetujuan Admin" + "Batalkan pengajuan".
- "Keluar" (mobile di bawah), versi build.
