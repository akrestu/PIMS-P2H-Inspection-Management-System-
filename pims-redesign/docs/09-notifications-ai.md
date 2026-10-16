# 09 · Notifikasi, WhatsApp, AI

## Jenis notifikasi
| Tipe | Pemicu | Penerima | Kanal default | Tautan |
|---|---|---|---|---|
| `kritis` | entry Tidak Layak diterima | Manager site | push + WA + in-app (**tidak bisa dimatikan** untuk push & WA) | Temuan |
| `eskalasi` | menunggu > 15 mnt | semua Manager site | push + WA | Persetujuan |
| `persetujuan` | entry baru (digabung per 5 mnt: "3 P2H baru menunggu persetujuan") | approver | push | Persetujuan |
| `pengingat_p2h` | 15 mnt sebelum batas (ke driver yang belum), saat batas (ke pengawas: "6 unit belum P2H Shift 1") | driver / Manager | push (+WA driver) | Beranda / Monitoring |
| `temuan_overdue` | harian 07:00 | PJ & Manager | push + email | Temuan |
| `temuan_ditugaskan` | PJ ditetapkan | PJ | push | Temuan |
| `hasil_persetujuan` | disetujui/ditolak (+alasan) | driver | push | Riwayat / Form |
| `ringkasan_harian` | 07:45 site tz | Manager site | WA | Ringkasan |
| `hapus_akun` | pengajuan | Admin | in-app + email | Pengguna |

- In-app: Laravel database notifications, dikelompokkan "Butuh tindakan" / "Temuan" / "Info"; titik biru = belum dibaca; hapus dengan Urungkan.
- Push: Web Push (VAPID) via service worker.
- **Jam tenang** 22:00–05:00 untuk non-kritis (ditunda).
- Preferensi per user per tipe × kanal (matriks Push/WA/Email di halaman Notifikasi desktop).

## WhatsApp
- **Manual (MVP)**: tombol "Kirim ke WhatsApp" membuka `https://wa.me/?text={encodeURIComponent(teks)}` — user memilih grup sendiri. Desktop: WhatsApp Web.
- **Otomatis** (pengingat, eskalasi, kritis, ringkasan): butuh WhatsApp Business API (provider mis. Meta Cloud API / Qontak / Wati). **Keputusan integrasi terbuka** — buat interface `WhatsAppSender` dengan driver `log` (dev) dan satu driver nyata; template pesan harus disetujui Meta.
- Format teks rekap (lihat `screens/laporan.md#ringkasan`): bold WA `*…*`, italic `_…_`, bullet `•`, tautan rekap publik di akhir (opsional).

## AI
Dipakai di 2 tempat; keduanya **opsional** (toggle di Pengaturan) dan diberi label "Dibuat AI … periksa sebelum dibagikan".

1. **Ringkasan harian/periode** — input: metrik terstruktur (JSON) hari ini & kemarin: P2H masuk/total, layak/tidak, belum + daftar unit, unit BD + penyebab, temuan baru/tutup/open/overdue, PA, unit berulang belum P2H 7 hari. Output: 1 paragraf ≤ 90 kata, Bahasa Indonesia, angka format Indonesia, diakhiri kalimat "Prioritas: …". Kalimat terakhir dipakai di teks WA.
2. **Saran perbaikan temuan** — input: item, catatan driver, tipe/model unit, riwayat temuan serupa unit (60 hari). Output: kemungkinan penyebab + 3–5 langkah bernomor + catatan riwayat. Tanpa angka torsi/part number yang tidak ada di data ("sesuai spesifikasi/katalog unit").

Implementasi: panggilan server-side (mis. Anthropic Claude API) lewat job/queue, **streaming** ke klien (SSE / chunked) untuk efek ketik; cache hasil per (site, tanggal) / (temuan); tombol "Buat ulang". Jangan kirim nama orang ke model bila tidak perlu (pakai kode unit). Timeout 20 dtk → pesan "Ringkasan AI belum tersedia. Coba lagi." Log token usage.
