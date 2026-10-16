# Layar · Auth

## 1. Masuk (`/login`) — FINAL
Gambar: `design/screens/Login-Desktop.png` (≥ 1024, terang), `Login-Desktop-Gelap.png`, `design/screens/Login-Mobile.png` (< 1024).
Prototype: `Login.dc.html` (responsif), `Login-M.dc.html`, komponen `LoginNRPForm.dc.html`.
(`Auth.dc.html` tetap dipakai untuk lupa/reset/verifikasi/2FA; eksplorasi `Login-Hero/Gelap/Fokus` hanya arsip.)

**Satu metode untuk semua peran: NRP + kata sandi.** Email tidak dipakai untuk login (hanya untuk reset & notifikasi).

### Layout
- **Mobile & tablet (< 1024) — gaya "Hero"**, tema mengikuti preferensi (default light):
  - Foto alat berat 300px di atas (`object-position: 58% 40%`), gradien `rgba(10,10,10,.4)` → transparan → `--background`. Logo 34 + "PIMS" (putih, text-shadow) kiri atas; "P2H unit & alat berat" kanan atas.
  - Form naik menimpa foto (`margin-top: -64px`), padding 24. Footer "PIMS v1.0 · masuk tercatat di Audit Log".
- **Desktop (≥ 1024) — gaya "kartu kaca"**, mengikuti tema (default **terang**, seragam dengan mobile):
  - Latar + motif topo (`design/assets/topo-motif.png`) **memenuhi seluruh layar** (`position:absolute; inset:0; width/height:100%; object-fit:cover`) — tanpa glow/cahaya — + kartu kaca terpusat (lebar maks 440, padding 36, radius 28, `backdrop-filter: blur(24px) saturate(140%)`).
  - Header: logo + "PIMS" kiri; pill status kanan "● Shift 1 · 05:42 WITA" (titik hijau berdenyut; jam & shift dari server). Footer tengah "PIMS v1.0 · masuk tercatat di Audit Log".
  - Nilai per tema (CSS variables pada wrapper):

| Token | light (default) | dark | hc |
|---|---|---|---|
| latar | `#F7F7F5` | `#0A0A0A` | `#FFFFFF` |
| opacity topo | .22 | .16 | 0 |
| kartu | `rgba(255,255,255,.78)` | `rgba(22,22,24,.62)` | `#FFF` |
| border kartu | `rgba(10,10,10,.07)` | `rgba(255,255,255,.08)` | `#000` 2px |
| bayangan kartu | `0 40px 80px -32px rgba(10,10,10,.22)` + inset putih | `0 40px 80px -24px rgba(0,0,0,.8)` | none |

  Gambar: `Login-Desktop.png` (terang), `Login-Desktop-Gelap.png`.

### Form (`LoginNRPForm`, lebar maks 400)
1. Judul "Masuk ke PIMS" (30/600) + "Gunakan NRP dan kata sandi Anda."
2. Banner error (`role="alert"`, `danger-soft`) — hanya untuk error server/kunci.
3. **NRP**: tinggi 56, radius 14, ikon kartu ID, `inputmode="numeric"`, `maxlength=8`, hanya angka (karakter lain dibuang saat mengetik), `autocomplete="username"`, placeholder "8 digit, mis. 20231045". Centang hijau saat 8 digit.
4. **Kata sandi**: ikon gembok, `autocomplete="current-password"`, tombol mata 44 (`aria-pressed`, "Tampilkan/Sembunyikan kata sandi"). Peringatan "Caps Lock aktif" (warning) via `getModifierState`.
5. Baris: checkbox "Ingat perangkat ini" (default aktif, sesi 30 hari) · tautan "Lupa kata sandi?".
6. Tombol **"Masuk"** brand (kuning, teks hitam) 56. Loading: spinner + "Memeriksa…".
7. Catatan: "Belum punya akun atau NRP terkunci? Hubungi admin site Anda."

### Validasi & error
| Kondisi | Tampilan |
|---|---|
| NRP kosong saat submit | di bawah field: "Masukkan NRP." + border merah + shake |
| NRP ≠ 8 digit | "NRP harus 8 digit angka." |
| Kata sandi kosong | "Masukkan kata sandi." |
| NRP tidak dikenal **atau** sandi salah | banner "NRP atau kata sandi salah. Sisa {n} percobaan." (pesan sama — jangan bocorkan NRP mana yang terdaftar); field sandi dikosongkan + merah |
| 5× gagal (per NRP + IP) | banner "Terlalu banyak percobaan. Coba lagi dalam {s} detik." + tombol nonaktif "Tunggu {s} dtk", hitung mundur 60 dtk. Tercatat di Audit Log. |
| Akun nonaktif | "Akun Anda dinonaktifkan. Hubungi admin site." |

### Setelah berhasil
Centang kuning (pop + ring) + "Selamat pagi, {nama depan}" (sapaan sesuai jam site: pagi < 11, siang < 15, sore < 18, malam) + bar progres 1,4 dtk → redirect:
- Driver → `/beranda` ("Membuka Beranda · Shift 1 · DT-1045 menunggu P2H Anda.")
- Manager → `/dashboard`
- Admin → `/two-factor-challenge` (2FA wajib) lalu `/dashboard`.
Gunakan `router.visit` setelah animasi; hormati reduced motion (langsung redirect).

## 2. Lupa kata sandi
"Masukkan NRP Anda. Kami kirim tautan untuk membuat kata sandi baru ke email dan WhatsApp yang terdaftar." → field **NRP** → "Kirim tautan reset". Respons selalu sama walau NRP tidak terdaftar.

## 3. Tautan terkirim
"Tautan reset dikirim ke b***i@kontraktor.co.id dan WhatsApp terdaftar. Berlaku 60 menit. Cek folder spam bila belum masuk." Kirim ulang (cooldown 60 dtk). Driver tanpa email → hanya WhatsApp.

## 4. Buat kata sandi baru
Dua field + meter kekuatan 4 segmen (≥ 8, huruf besar+kecil, angka, simbol/≥ 12). "Simpan kata sandi" → login otomatis.

## 5. Verifikasi email (Manager/Admin dengan email baru)
Sama seperti prototype `Auth.dc.html` (tweak "Verifikasi email").

## 6. Verifikasi 2 langkah
`InputOTP` 6 digit (auto-submit). Salah → shake + "Kode salah atau kedaluwarsa. Coba lagi." "Gunakan kode cadangan". Wajib Admin, opsional lainnya.
