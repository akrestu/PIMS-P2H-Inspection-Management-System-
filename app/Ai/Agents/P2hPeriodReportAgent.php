<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

/**
 * Menulis bagian "Analisis & Rekomendasi" untuk Periodic Report P2H.
 * Bagian data (kepatuhan, temuan, BBM, servis) tetap dari template agar
 * format dan angka selalu konsisten; AI hanya menambahkan interpretasi.
 */
#[Temperature(0.3)]
#[MaxTokens(800)]
#[Timeout(40)]
class P2hPeriodReportAgent implements Agent
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
        Kamu adalah analis fleet management tambang. Dari data JSON laporan P2H (Pemeriksaan Harian Kendaraan) periodik, tulis bagian ANALISIS & REKOMENDASI untuk manajemen.

        Aturan:
        - Tulis 3-5 poin bernomor (1. 2. 3.), masing-masing 1-2 kalimat, Bahasa Indonesia formal.
        - Setiap poin WAJIB bersandar pada angka di data dan menyebut angkanya. Jangan menyimpulkan hal yang bertentangan dengan data (contoh: jangan sarankan menunjuk PIC bila temuan.tanpa_pic = 0; jangan sebut BBM boros bila bbm.unit_boros kosong).
        - Prioritaskan: kepatuhan P2H rendah (< 90%), temuan kode AA, temuan berulang, temuan lewat target, temuan tanpa PIC, unit BBM boros / pengisian tidak wajar, servis terlambat.
        - Bila data BBM (liter = 0) atau servis kosong, cukup sarankan kelengkapan pengisian data tersebut, tanpa menyimpulkan kondisi unit.
        - Format WhatsApp polos: tanpa judul, tanpa heading "#", tanpa tabel, tanpa blok kode, tanpa pembuka/penutup. Keluarkan hanya daftar poin.
        PROMPT;
    }
}
