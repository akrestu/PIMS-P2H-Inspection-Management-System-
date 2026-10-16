# 05 · Peran & izin

Implementasi: Laravel Policies + Gate; kirim `can` (map boolean) di shared Inertia props agar UI menyembunyikan/menonaktifkan aksi. **UI bukan pengaman** — selalu cek di server. Akses ditolak → halaman 403 (desain di `screens/admin.md`).

Cakupan site: Driver & Manager terikat ke ≥ 1 site (`site_user`). Admin = semua site. Semua query difilter site aktif (pemilih site di sidebar/app bar; Manager multi-site bisa pilih "Semua site").

## Matriks

| Kemampuan | Driver | Manager | Admin |
|---|:-:|:-:|:-:|
| Isi P2H (unit di site sendiri) | ✅ | ✅* | ✅* |
| Lihat Riwayat P2H | unit/entry sendiri | site | semua |
| Unduh PDF sesi / export | sendiri | ✅ | ✅ |
| Hapus entry / sesi P2H (alasan wajib → Sampah) | ❌ | ❌ | ✅ |
| Setujui / tolak P2H | ❌ | ✅ (non-LV di site; LV bila *Approver LV* atau saat eskalasi) | ✅ |
| Dashboard, Monitoring, Kepatuhan | ❌ | ✅ | ✅ |
| Kirim pengingat/teguran WhatsApp | ❌ | ✅ | ✅ |
| Temuan: lihat | unit sendiri | ✅ | ✅ |
| Temuan: tetapkan PJ, ubah tenggat, tutup (foto + catatan) | ❌ | ✅ | ✅ |
| Notifikasi & preferensi sendiri | ✅ | ✅ | ✅ |
| Laporan (ringkasan, periode, analitik, PA) | ❌ | ✅ | ✅ |
| Downtime: catat/ubah/tandai Ready | ❌ | ✅ | ✅ |
| Ubah status unit (Ready/BD/PM/Servis) | ❌ | ✅ | ✅ |
| Master unit: lihat | ❌ | ✅ | ✅ |
| Master unit: tambah/ubah/import/Sampah/pulihkan | ❌ | ✅ (site sendiri) | ✅ |
| Master site: tambah/ubah/Sampah | ❌ | ❌ (baca) | ✅ |
| Hapus permanen (ketik HAPUS) | ❌ | ❌ | ✅ |
| Pengguna: kelola driver di site sendiri | ❌ | ✅ | ✅ |
| Pengguna: kelola Manager/Admin, ubah peran | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ (403) | ✅ |
| Pengaturan aplikasi & token rekap publik | ❌ | ❌ (403) | ✅ |
| Akun saya, ganti kata sandi, 2FA, sesi | ✅ | ✅ | ✅ (2FA wajib) |
| Ajukan hapus akun (disetujui Admin) | ✅ | ✅ | ✅ (disetujui Admin lain) |
| Lihat rekap publik | publik dengan token | | |

\* Manager/Admin boleh mengisi P2H bila juga mengoperasikan unit (jarang); UI driver tetap sama.

## Aturan tambahan
- Driver hanya bisa memilih unit di site-nya yang **belum di-P2H pada shift ini** dan statusnya bukan `PM`/`Servis` (BD boleh — P2H mengonfirmasi kondisi). Unit yang ditugaskan tampil teratas.
- Approver LV: flag `is_lv_approver` per Manager per site.
- Manager tidak dapat melihat/mengubah akun dengan peran lebih tinggi; tombol "Ubah" tampil nonaktif + tooltip "Hanya Admin yang dapat mengubah akun Manager".
- Audit log tidak bisa diubah/dihapus oleh siapa pun (append-only).
