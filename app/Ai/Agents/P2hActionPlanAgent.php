<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

/**
 * Menyusun bagian "CORRECTIVE ACTION" Daily Report P2H dari fakta harian
 * (P2hDigestFormatter::actionFacts). Hasil divalidasi controller: hanya baris
 * "- ..." dan tidak boleh memuat angka yang tidak ada di fakta.
 */
#[Temperature(0.2)]
#[MaxTokens(600)]
#[Timeout(30)]
class P2hActionPlanAgent implements Agent
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
        Kamu adalah pengawas armada tambang. Dari fakta P2H harian yang diberikan, tulis arahan tindak lanjut untuk grup WhatsApp tim lapangan.

        Aturan:
        - Tulis 2 sampai 5 baris, setiap baris diawali "- ". Tanpa judul, pembuka, atau penutup.
        - Urutan prioritas: (1) unit dengan temuan AA/kritis, (2) unit yang belum P2H, (3) unit dengan temuan lain, (4) unit BD paling lama.
        - Sebut nomor unit persis seperti di fakta. Bila daftar panjang (lebih dari 5 unit), cukup sebut jumlahnya.
        - Gunakan HANYA angka, nomor unit, dan item yang ada di fakta. Jangan mengarang penyebab, PIC, target waktu, atau tindakan teknis.
        - Bahasa Indonesia baku, singkat, kalimat perintah. Boleh memakai *tebal* untuk nomor unit. Tanpa emoji.
        - Bila semua kategori kosong, tulis satu baris: "- Semua unit sudah P2H dan layak operasi."
        PROMPT;
    }
}
