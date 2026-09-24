<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Mengubah hasil DailyP2hDigest menjadi teks Daily Report siap tempel di WhatsApp.
 *
 * Dirancang untuk grup WhatsApp di HP: tanpa garis pemisah dan indentasi
 * (WhatsApp tidak mempertahankannya saat baris terlipat), label *tebal*,
 * teks bebas dari lapangan _miring_, daftar "- " bawaan WhatsApp, dan unit
 * yang layak tanpa temuan diringkas menjadi satu baris.
 */
class P2hDigestFormatter
{
    public const STATUS_LABEL = [
        'open' => '🔴 Open',
        'progress' => '🟡 On Progress',
        'closed' => '🟢 Closed',
    ];

    public static function toWhatsApp(array $digest): string
    {
        $scope = collect([
            $digest['jenis_unit'] ?? 'Semua Unit',
            $digest['site'] ? "Site {$digest['site']}" : null,
        ])->filter()->implode(' · ');

        $lines = [
            '*DAILY REPORT P2H*',
            "_{$scope} · {$digest['tanggal_label']}_",
        ];

        if ($digest['units'] === []) {
            $lines[] = '';
            $lines[] = '_Tidak ada unit yang melakukan P2H pada periode ini._';
        }

        // Rentang lebih dari 1 hari → dikelompokkan per tanggal P2H
        foreach (collect($digest['units'])->groupBy('tanggal') as $tanggal => $units) {
            if ($digest['multi_hari'] ?? false) {
                $lines[] = '';
                $lines[] = '🗓️ *'.strtoupper(Carbon::parse($tanggal)->locale('id')->translatedFormat('l, d M Y')).'*';
            }

            $lines = [...$lines, ...self::dayLines($units)];
        }

        if (($digest['servis'] ?? []) !== []) {
            $lines[] = '';
            $lines[] = '*JADWAL SERVIS BERKALA*';

            foreach ($digest['servis'] as $unit) {
                $lines[] = self::serviceLine($unit);
            }
        }

        // Keterangan simbol cukup sekali di akhir, hanya bila simbolnya dipakai
        $findings = collect($digest['units'])->flatMap(fn ($u) => $u['findings']);
        $legend = collect([
            $findings->contains(fn ($f) => $f['kode_bahaya'] === 'AA') ? '⛔ AA = bahaya kritis' : null,
            $findings->contains(fn ($f) => $f['berulang'] ?? null) ? '🔁 = berulang dalam '.config('p2h.findings.recurring_window_days').' hari' : null,
        ])->filter();

        $lines[] = '';
        if ($legend->isNotEmpty()) {
            $lines[] = '_Ket: '.$legend->implode(' · ').'_';
        }
        $lines[] = '_Dikirim dari PIMS - P2H Management System_';

        return implode("\n", $lines);
    }

    /**
     * Unit BD dan unit dengan temuan ditulis lengkap (BD lebih dulu);
     * unit layak tanpa temuan cukup satu baris daftar nomor unit.
     */
    private static function dayLines(Collection $units): array
    {
        $detailed = $units
            ->filter(fn ($u) => $u['kondisi'] !== 'layak')
            ->sortBy(fn ($u) => [$u['kondisi'] === 'tidak_layak' ? 0 : 1, $u['no_unit']])
            ->values();
        $clean = $units->where('kondisi', 'layak')->values();

        $lines = [];

        foreach ($detailed as $i => $unit) {
            $lines = [...$lines, '', ...self::unitLines($i + 1, $unit)];
        }

        if ($clean->isNotEmpty()) {
            $overrides = $clean->filter(fn ($u) => $u['keputusan']['berbeda_dari_rekomendasi'] ?? false);

            $lines[] = '';
            $lines[] = "✅ *LAYAK TANPA TEMUAN ({$clean->count()} unit)*";
            $lines[] = $clean->map(fn ($u) => self::clean($u['no_unit']))->implode(', ');

            // Keputusan yang menyimpang dari rekomendasi sistem tetap perlu terlihat
            foreach ($overrides as $unit) {
                $lines[] = '⚠️ *'.self::clean($unit['no_unit']).'* '.self::overrideNote($unit['keputusan']);
            }
        }

        return $lines;
    }

    private static function unitLines(int $no, array $unit): array
    {
        $keputusan = $unit['keputusan'] ?? [];
        $status = ($keputusan['final'] ?? $unit['kondisi_akhir']) === 'BD'
            ? '❌ *BREAKDOWN (BD)*'
            : '⚠️ *LAYAK PAKAI — ADA TEMUAN*';
        $lambung = $unit['no_lambung'] ? ' · '.self::clean($unit['no_lambung']) : '';
        $drivers = collect($unit['entries'])
            ->map(fn ($e) => self::clean($e['driver'] ?? '-').($e['shift'] ? " _({$e['shift']})_" : ''))
            ->unique()
            ->implode(', ');

        $lines = [
            "*{$no}. ".self::clean($unit['no_unit'])."*{$lambung}",
            "*Status:* {$status}",
        ];

        if ($keputusan['berbeda_dari_rekomendasi'] ?? false) {
            $lines[] = '⚠️ '.self::overrideNote($keputusan);
        }

        $lines[] = "*Driver:* {$drivers}";

        if ($keputusan['alasan'] ?? null) {
            $lines[] = '*Alasan:* _'.self::clean($keputusan['alasan']).'_';
        }

        return [...$lines, ...self::findingsBlock($unit['findings'])];
    }

    private static function overrideNote(array $keputusan): string
    {
        return "_Keputusan tidak sesuai rekomendasi sistem ({$keputusan['rekomendasi_sistem']})_";
    }

    /**
     * Daftar temuan satu unit. PIC, tindakan, dan status yang sama untuk semua
     * temuan ditulis sekali; yang berbeda ditulis di akhir baris temuan.
     */
    private static function findingsBlock(array $findings): array
    {
        if ($findings === []) {
            return [];
        }

        // Kode bahaya AA (kritis) selalu di atas
        $findings = collect($findings)->sortBy(fn ($f) => $f['kode_bahaya'] === 'AA' ? 0 : 1)->values();

        $fields = [
            'pic' => fn ($f) => '*PIC:* '.($f['pic'] ? self::clean($f['pic']) : '_Belum ditunjuk_'),
            'status' => fn ($f) => '*Progress:* '.(self::STATUS_LABEL[$f['status']] ?? $f['status'])
                .($f['target'] ? ' _(target '.Carbon::parse($f['target'])->format('d/m/Y').')_' : ''),
            'tindakan' => fn ($f) => '*Tindakan:* _'.($f['tindakan'] ? self::clean($f['tindakan']) : 'Belum ditentukan').'_',
        ];
        $shared = collect($fields)->filter(fn ($render) => $findings->map($render)->unique()->count() === 1);
        $varying = collect($fields)->diffKeys($shared);

        $lines = ['', '*Temuan ('.$findings->count().'):*'];

        foreach ($findings as $f) {
            // Penanda penting ditebalkan agar langsung tertangkap
            $notes = collect([
                $f['kode_bahaya'] === 'AA' ? '⛔ *AA*' : null,
                ($f['berulang'] ?? null) ? "🔁 *{$f['berulang']}x*" : null,
                ($f['overdue'] ?? false) ? '⏰ *Lewat target*' : null,
            ])->filter();

            $lines[] = '- '.self::clean($f['item'])
                .($f['keterangan'] ? ' — _'.self::clean($f['keterangan']).'_' : '')
                .($notes->isNotEmpty() ? ' '.$notes->implode(' ') : '');

            if ($varying->isNotEmpty()) {
                $lines[] = '↳ '.$varying->map(fn ($render) => $render($f))->implode(' · ');
            }
        }

        if ($shared->isNotEmpty()) {
            $lines[] = '';
            // PIC & progress satu baris; tindakan (bisa panjang) di baris sendiri
            $picStatus = $shared->only(['pic', 'status']);
            if ($picStatus->isNotEmpty()) {
                $lines[] = $picStatus->map(fn ($render) => $render($findings->first()))->implode(' · ');
            }
            if ($shared->has('tindakan')) {
                $lines[] = $shared['tindakan']($findings->first());
            }
        }

        return $lines;
    }

    /**
     * Teks bebas dari form: buang karakter format WhatsApp (* _ ~ `) agar tidak
     * merusak huruf tebal/miring, misalnya nama item "APAR*".
     */
    private static function clean(?string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', str_replace(['*', '_', '~', '`'], '', (string) $text)));
    }

    public static function serviceLine(array $unit): string
    {
        $km = fn (?int $v) => $v === null ? '-' : number_format($v, 0, ',', '.');

        if ($unit['status'] === 'overdue') {
            return "- 🔴 *{$unit['no_unit']}* terlambat {$km(abs($unit['sisa_km']))} km (jadwal {$km($unit['km_servis_berikutnya'])})";
        }

        $estimasi = $unit['estimasi_hari'] ? " / ±{$unit['estimasi_hari']} hari" : '';

        return "- 🟡 *{$unit['no_unit']}* {$km($unit['sisa_km'])} km lagi{$estimasi} (jadwal {$km($unit['km_servis_berikutnya'])})";
    }
}
