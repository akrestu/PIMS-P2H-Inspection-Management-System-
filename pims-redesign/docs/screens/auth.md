# Layar · Auth

## 1. Masuk (`/login`) — FINAL
Gambar: `design/screens/Login.png` (desktop ≥ 1024), `design/screens/Login-M.png` (mobile < 1024).
Prototype: `MW-Login.dc.html` (responsif), `MW-Login-M.dc.html`, komponen `MWLoginForm.dc.html`.
(`MW-Auth.dc.html` dipakai untuk lupa/reset/verifikasi/2FA — gambar `Auth-Lupa.png`, `Auth-Reset.png`, `Auth-Verifikasi.png`, `Auth-2FA.png`.)

**Satu metode untuk semua peran: NRP + kata sandi.** Email tidak dipakai untuk login (hanya untuk reset & notifikasi).

### Layout (gaya MyWahana)
- **Mobile & tablet (< 1024)**: foto hero gunung (`design/assets/hero-mountain.jpg`) di atas dengan pill logo "PIMS" kiri atas; sudut bawah hero radius 28. Form di bawahnya di atas latar krem + motif topo samar. Tombol "Masuk" pill hitam 56.
- **Desktop (≥ 1024)**: latar `--background`, **satu kartu terpusat** lebar maks 896, radius 28, putih, bayangan besar halus, grid 2 kolom:
  - Kiri: foto gunung (min-height 566, `object-fit: cover`), pill "PIMS" kiri atas, caption lokasi kanan bawah.
  - Kanan: form (padding 44/40) dengan motif topo (`design/assets/topo-motif-mw.png`, opacity .45) di latar.
  - Footer "PIMS v1.0 · masuk tercatat di Audit Log".
- Tema terang & gelap mengikuti token; tidak ada tema kontras tinggi.

### Form (`LoginNRPForm`, lebar maks 400)
1. Judul "Masuk ke PIMS" (30/600) + "Gunakan NRP dan kata sandi Anda."
2. Banner error (`role="alert"`, `danger-soft`) — hanya untuk error server/kunci.
3. **NRP**: tinggi 56, radius 16, field terisi (`--input-fill`) tanpa garis, ikon kartu ID, `inputmode="numeric"`, `maxlength=8`, hanya angka (karakter lain dibuang saat mengetik), `autocomplete="username"`, placeholder "8 digit, mis. 20231045". Centang hijau saat 8 digit.
4. **Kata sandi**: ikon gembok, `autocomplete="current-password"`, tombol mata 44 (`aria-pressed`, "Tampilkan/Sembunyikan kata sandi"). Peringatan "Caps Lock aktif" (warning) via `getModifierState`.
5. Baris: checkbox "Ingat perangkat ini" (default aktif, sesi 30 hari) · tautan "Lupa kata sandi?".
6. Tombol **"Masuk"** primer (pill hitam, teks putih; di tema gelap terbalik) 56. Loading: spinner + "Memeriksa…".
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
