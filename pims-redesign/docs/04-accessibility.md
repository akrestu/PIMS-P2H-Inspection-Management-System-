# 04 · Aksesibilitas (target WCAG 2.2 AA; AAA teks di tema `hc`)

## Wajib
- **Kontras**: teks ≥ 4.5:1 (besar ≥ 3:1) di light & dark; ≥ 7:1 di `hc`. Status selalu pill + ikon/titik + label (tidak bergantung warna).
- **Target sentuh** ≥ 48×48 (WCAG 2.5.8 minimum 24, kita pakai 48 karena sarung tangan). Jarak ≥ 8.
- **Fokus terlihat**: outline 2px `foreground` + ring 5px kuning. Field: ring di wrapper. Jangan `outline: none` tanpa pengganti.
- **Elemen asli**: tombol = `<button>`, tautan navigasi = `<a>`/Inertia `<Link>`, input asli. Jangan `div role="button"`.
- **Konten tersembunyi** (collapse, sheet tertutup) tidak boleh bisa difokus → render kondisional, bukan sekadar disembunyikan.
- **Dialog/sheet/drawer**: `role="dialog"`/`alertdialog`, `aria-modal`, `aria-labelledby`, fokus terperangkap, kembali ke pemicu saat tutup, Esc menutup (Radix/vaul sudah menangani).
- **Tabel**: `<table>` asli, `<th scope>` , `aria-sort` di kolom sortable, checkbox baris dengan `aria-label="Pilih DT-1045"`.
- **Toast**: `role="status"`; error penting juga ditampilkan di tempat (bukan hanya toast).
- **Live region**: progres unggah, streaming AI (`aria-live="polite"`), hitungan pilihan.
- **Form**: label terlihat untuk setiap input; error dikaitkan (`aria-describedby`), `aria-invalid`. Jangan hanya placeholder.
- **Gesture punya alternatif**: swipe (Persetujuan) → tombol Setujui/Tolak; long-press → checkbox/"Pilih"; drag-drop import → tombol "Pilih file"; tanda tangan wajib tidak punya alternatif teks, jadi beri mode layar penuh & tombol Ulangi.
- **Chart**: `aria-label` ringkasan + sel heatmap adalah `<button aria-label="LV-034, 14 Okt: Tidak P2H">`; tooltip juga muncul saat fokus.
- **Reduced motion** dihormati (lihat `03`).
- **Zoom 200%** tanpa kehilangan fungsi; tidak ada scroll horizontal halaman di 320px (tabel boleh scroll di wadahnya).
- **Bahasa**: `<html lang="id">`.

## Pemeriksaan sebelum rilis
1. axe-core di Playwright untuk setiap halaman × 3 tema.
2. Navigasi keyboard penuh: Form P2H, Persetujuan (termasuk pintasan), tabel + bulk bar, drawer.
3. TalkBack (Android) untuk alur driver: login → Isi P2H → kirim.
4. Uji luar ruangan (tema `hc`) di HP kelas menengah.
