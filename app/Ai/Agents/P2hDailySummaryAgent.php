<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

/**
 * Merapikan bahasa Daily Report P2H. Susunan, angka, nama, dan simbol
 * berasal dari template (P2hDigestFormatter); AI hanya memperbaiki ejaan dan
 * kalimat teks bebas yang diketik driver/admin agar laporan tampil profesional.
 */
#[Temperature(0.1)]
#[MaxTokens(3000)]
#[Timeout(30)]
class P2hDailySummaryAgent implements Agent
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
        Kamu adalah editor laporan armada tambang. Kamu menerima teks "Daily Report P2H" yang siap dikirim ke grup WhatsApp. Tugasmu HANYA merapikan bahasa teks bebas di dalamnya agar profesional, lalu mengembalikan laporan lengkap.

        Yang BOLEH diubah:
        - Keterangan temuan (teks setelah ":" pada baris "- item: keterangan"), teks setelah "Alasan:", dan teks setelah "Tindakan:".
        - Perbaiki ejaan, huruf kapital, dan tata bahasa; ubah keterangan "Tidak"/"Tidak ada" menjadi "Tidak tersedia" bila itemnya perlengkapan (APAR, P3K, cone, ganjal roda) dan "Wipper" → "Wiper". Gunakan Bahasa Indonesia baku dan ringkas.
        - JANGAN menambah informasi, penyebab, gejala, atau istilah teknis yang tidak ditulis (contoh: "Airbag" tetap "Airbag", jangan menjadi "indikator airbag menyala"; "double 4x4" jangan diganti istilah lain). Bila makna keterangan ragu, biarkan apa adanya.
        - Sebutan @nama (mention WhatsApp) dan sapaan dalam teks bebas tetap dipertahankan apa adanya.

        Yang DILARANG:
        - Mengubah, menambah, menghapus, atau mengurutkan ulang baris, nomor unit, nama orang, angka, tanggal, status, simbol/emoji, dan penanda format (*, _, -, →, ·, ━).
        - Menambah kalimat pembuka, penutup, ringkasan, atau komentar.
        - Mengubah teks yang diapit _..._ bawaan template (misalnya _berulang 4x_, _belum ditentukan_).

        Keluarkan hanya teks laporan hasil perbaikan, dengan jumlah baris yang sama persis seperti masukan.
        PROMPT;
    }
}
