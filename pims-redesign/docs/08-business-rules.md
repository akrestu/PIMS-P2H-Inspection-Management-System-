# 08 · Aturan bisnis (sumber kebenaran)

Bila prototype berbeda dengan dokumen ini, **ikuti dokumen ini**. Semua aturan diuji dengan Pest (lihat `12-implementation-plan.md`).

## 1. Shift & tenggat
- Pengaturan global: `shifts_per_day` 1/2/3 (default **2**), `shift1_start` (default **06:00**). Shift berikutnya = shift1 + n × (24/shifts). Default: Shift 1 06:00–18:00, Shift 2 18:00–06:00.
- Jam dihitung di **zona waktu site**. "Tanggal operasional" Shift 2 = tanggal saat shift dimulai.
- **Batas P2H** = mulai shift + `p2h_deadline_minutes` (default **30** → 06:30).
- Status per unit per shift:
  - `ok` — P2H pertama dikirim ≤ batas.
  - `late` — dikirim setelah batas, sebelum shift berakhir.
  - `miss` — tidak ada P2H sampai shift berakhir, padahal unit wajib.
  - `off` — tidak wajib: unit berstatus BD/PM/Servis **sepanjang** shift (atau tidak dioperasikan / tanpa driver ditugaskan).
- **Kepatuhan** = ok ÷ (ok + late + miss). Target 95%. Warna persen: < 80 danger, < 95 warning, selainnya normal.
- `submitted_at` untuk entry offline = waktu **pengisian di perangkat** (ditandatangani), bukan waktu sinkron; server menolak bila selisih > 12 jam atau di masa depan > 5 menit (toleransi jam HP).

## 2. Form P2H
1. **Pilih unit & shift**: unit di site driver; unit yang ditugaskan tampil teratas ("Ditugaskan"). Unit yang sudah punya sesi di shift ini **terkunci** — kecuali opsi "Ambil alih (ganti driver)" yang menambah **entry baru** ke sesi yang sama. Unit `PM`/`Servis` tidak bisa dipilih (tampil nonaktif + alasan).
2. **Checklist 18 item** (4 kategori, `data/checklist-items.json`), masing-masing Baik/Rusak. Rusak → catatan wajib (min 5 karakter); item **kritis** rusak → foto item wajib. Semua item wajib dijawab.
3. **HM & BBM**: `hm_start` wajib, ≥ HM terakhir unit; bila lompatan > 24 jam dari HM terakhir → konfirmasi "HM naik X jam sejak P2H terakhir. Benar?". KM wajib untuk LV/DT. Level tangki wajib. "Isi BBM sebelum operasi" → liter wajib (1–2000). "Ada servis sejak P2H terakhir?" ya → catatan. Bila HM mendekati PM (≤ 50 jam) tampilkan info "PM 500 jam di HM 12.500".
4. **Foto lampiran**: 2 wajib — unit tampak depan, panel HM. Dikompres ±300 KB.
5. **Review**: ringkasan + **perkiraan hasil** (Layak / Tidak Layak) sebelum tanda tangan.
6. **Tanda tangan** driver + centang pernyataan "Saya menyatakan pemeriksaan ini saya lakukan sendiri dan datanya benar." (wajib).
7. **Kirim** → layar sukses Layak / Tidak Layak + info "Diteruskan ke {approver}".
- Draft tersimpan otomatis di perangkat setiap perubahan ("Draft tersimpan otomatis · 06:04"). Offline → antre (lihat `11-pwa-offline.md`).
- `hm_end` diisi driver di akhir shift dari Beranda (opsional, mengisi PA/utilisasi).

## 3. Hasil & status unit otomatis
- **Tidak Layak** ⇔ ≥ 1 item kritis Rusak. Selain itu Layak (walau ada item non-kritis rusak).
- Saat entry Tidak Layak **diterima server** (bukan saat disetujui):
  - Unit → `bd`, `status_since = submitted_at`.
  - Buat **downtime** `bd` sumber `p2h_otomatis` mulai `submitted_at`.
  - Notifikasi "Item kritis rusak" ke semua Manager site (push + WA; tidak bisa dimatikan).
  - Audit: aktor **Sistem**, aksi `otomatis`, "menandai BD dari P2H tidak layak".
- Setiap item Rusak → **temuan** dibuat saat entry diterima: kritis → tenggat **akhir shift berjalan** (18:00); non-kritis → **+3 hari** 18:00. PJ default per kategori (Mesin & cairan/Rem/Ban → Mekanik; Lampu & kelistrikan → Elektrik; kabin/spion/tangga → Tim Body) — dapat diubah.
- Unit kembali `ready` **hanya** lewat aksi Manager ("Tandai Ready" di Downtime/Dashboard/Master unit) — saat itu downtime ditutup `ended_at = now`. Bila masih ada temuan kritis open untuk unit itu → konfirmasi "Masih ada 1 temuan kritis terbuka. Tetap tandai Ready?".
- Perubahan status manual (Ready/BD/PM/Servis) selalu membuat/menutup periode downtime dan tercatat di Audit Log.

## 4. Persetujuan
- Setiap entry butuh persetujuan. Approver:
  - Unit **LV** → `units.lv_approver_id` atau `sites.default_approver_id`, atau Manager site dengan `is_lv_approver`.
  - Unit lain → Manager mana pun di site.
- **Eskalasi**: bila `menunggu` > **15 menit** → status `eskalasi`, notifikasi "Eskalasi persetujuan" ke **semua** Manager site (dan Admin bila site tanpa Manager). Job terjadwal tiap menit.
- **Setujui**: butuh **tanda tangan approver** (sekali per sesi browser cukup untuk persetujuan massal; simpan per entry). Massal hanya untuk entry yang dipilih; boleh termasuk Tidak Layak (menyetujui = mengonfirmasi hasil; unit tetap BD).
- **Tolak**: alasan wajib (chip cepat: Foto tidak jelas, HM tidak sesuai, Item belum dicek, Unit salah, atau teks). Driver diberi notifikasi + diminta mengisi ulang; unit dibuka kembali untuk entry baru; temuan dari entry ini ditandai **dibatalkan** (soft) dan, bila entry Tidak Layak, status BD **tidak** dibatalkan otomatis (Manager memutuskan).
- Urungkan (5 dtk) membatalkan setujui/tolak.

## 5. Temuan
- Kode `T-xxxx` berurutan per site. Status `open` / `closed`.
- **Lewat tenggat** bila `open` dan `now > due_at`. Ringkasan harian temuan overdue 07:00 ke PJ & pengawas.
- **Tutup temuan**: foto setelah perbaikan **wajib** + catatan perbaikan min 10 karakter. Penutupan temuan kritis terakhir → tawarkan "Tandai {unit} Ready".
- Tetapkan PJ (massal) → notifikasi ke PJ.
- Saran AI opsional (lihat `09`).

## 6. Downtime & PA
- Downtime = periode status ≠ Ready. Satu unit hanya boleh punya **satu** downtime berlangsung.
- Validasi: selesai > mulai; tidak tumpang-tindih dengan downtime lain unit yang sama.
- **PA unit/hari** = (1440 − menit downtime yang beririsan dengan hari tsb) ÷ 1440 × 100, dibulatkan 1 desimal. **PA armada** = rata-rata PA unit aktif di site. Target **90%**.
- Ramp warna heatmap PA: 100 → `#FEFBE8`/teks `#5C4A12`; ≥ 90 `#FBEA8A`; ≥ 75 `#F8DC52`; ≥ 60 `#B98F0A`/putih; < 60 `#684415`/putih.

## 7. Sampah & penghapusan
- Unit, site, pengguna, sesi/entry P2H, notifikasi (per user) → soft delete ke **Sampah** dengan `deleted_by` (+ alasan untuk P2H). Bisa **dipulihkan** 30 hari.
- Job harian 02:00 menghapus permanen item Sampah > 30 hari.
- **Hapus permanen** manual: Admin, dialog mengetik `HAPUS`. Riwayat P2H tetap menyimpan kode unit/nama site sebagai teks (denormalisasi `subject_label`).
- Site di Sampah: unit & driver terhubung ditandai "tanpa site" dan jadwal P2H unit tersebut dijeda; konfirmasi menyebut jumlahnya.
- **Hapus akun**: user mengajukan → Admin menyetujui → akun dinonaktifkan, nama di riwayat dianonimkan ("Driver #20231045"), data P2H tetap (kepatuhan). Admin tidak bisa menyetujui pengajuannya sendiri.

## 8. Audit log <a id="audit"></a>
Catat (append-only): login (berhasil/gagal ≥ 3×), setujui/tolak P2H, hapus/pulihkan apa pun, hapus permanen, ubah status unit, catat/ubah downtime, tutup/tetapkan temuan, import, undang/ubah/nonaktifkan pengguna, ubah peran, ubah pengaturan, buat ulang token rekap, aksi otomatis sistem (BD otomatis, eskalasi, kirim ringkasan). Simpan `changes` (field sebelum/sesudah) dan `context` (IP, perangkat, file, pemicu). Retensi 2 tahun.

## 9. Import Excel (unit, driver)
Template `.xlsx` maks 5 MB / 1.000 baris → validasi per baris (kode ganda, site kosong, format) → tampilkan "10 valid · 2 error" + daftar baris → "Impor N baris valid" → unduh baris error. Satu entri audit per import.

## 10. Rekap publik
- URL `/r/{site_code}/{token}`; token acak, dapat dibuat ulang (tautan lama langsung tidak berlaku → halaman "Tautan sudah tidak aktif") dan dinonaktifkan.
- Isi: angka hari ini (P2H masuk, layak/tidak, belum, BD, PA, temuan). **Tanpa nama orang**, tanpa foto. `noindex`, cache 60 dtk.

## 11. Angka & format
`Intl.NumberFormat('id-ID')`: `12.480,5`; persen `87,5%` (1 desimal bila < 100). Tanggal `16 Okt 2026`, hari singkat `Jum`, jam `06:00` 24-jam + label zona bila lintas site. Durasi `10 j 08 m`.
