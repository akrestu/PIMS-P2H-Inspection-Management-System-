<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Mengubah hasil DailyP2hDigest menjadi teks Daily Report siap tempel di WhatsApp.
 *
 * Dirancang ringkas untuk grup WhatsApp di HP: tanpa indentasi (WhatsApp tidak
 * mempertahankannya saat baris terlipat), memakai daftar "- " bawaan WhatsApp,
 * dan unit yang layak tanpa temuan diringkas menjadi satu baris.
 */
class P2hDigestFormatter
{
    public const STATUS_LABEL = [
        'open' => '🔴 Open',
        'progress' => '🟡 On Progress',
        'closed' => '🟢 Closed',
    ];

    private const DIVIDER = '━━━━━━━━━━━━━━━';

    public static function toWhatsApp(array $digest): string
    {
        $scope = collect([
            $digest['jenis_unit'] ?? 'Semua Unit',
            $digest['site'] ? "Site {$digest['site']}" : null,
        ])->filter()->implode(' · ');

        $lines = [
            '*DAILY REPORT P2H*',
            "{$scope} · {$digest['tanggal_label']}",
            self::DIVIDER,
        ];

        if ($digest['units'] === []) {
            $lines[] = '_Tidak ada unit yang melakukan P2H pada periode ini._';
        }

        // Rentang lebih dari 1 hari → dikelompokkan per tanggal P2H
        foreach (collect($digest['units'])->groupBy('tanggal') as $tanggal => $units) {
            if ($digest['multi_hari'] ?? false) {
                $lines[] = '';
                $lines[] = '🗓️ *'.Carbon::parse($tanggal)->locale('id')->translatedFormat('l, d M Y').'*';
            }

            $lines = [...$lines, ...self::dayLines($units)];
        }

        if (($digest['servis'] ?? []) !== []) {
            $lines[] = '';
            $lines[] = '*🔧 SERVIS BERKALA*';

            foreach ($digest['servis'] as $unit) {
                $lines[] = self::serviceLine($unit);
            }
        }

        $lines[] = self::DIVIDER;
        $lines[] = '_PIMS - P2H Management System_';

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
            $lines[] = "✅ *Layak tanpa temuan ({$clean->count()}):* "
                .$clean->map(fn ($u) => self::clean($u['no_unit']))->implode(', ');

            // Keputusan yang menyimpang dari rekomendasi sistem tetap perlu terlihat
            foreach ($overrides as $unit) {
                $lines[] = '⚠️ '.self::clean($unit['no_unit']).': '.self::overrideNote($unit['keputusan']);
            }
        }

        return $lines;
    }

    private static function unitLines(int $no, array $unit): array
    {
        $keputusan = $unit['keputusan'] ?? [];
        $status = ($keputusan['final'] ?? $unit['kondisi_akhir']) === 'BD'
            ? '❌ *BD*'
            : '⚠️ *Layak Pakai*';
        $lambung = $unit['no_lambung'] ? ' ('.self::clean($unit['no_lambung']).')' : '';
        $drivers = collect($unit['entries'])
            ->map(fn ($e) => self::clean($e['driver'] ?? '-').($e['shift'] ? " ({$e['shift']})" : ''))
            ->unique()
            ->implode(', ');

        $lines = ["*{$no}. ".self::clean($unit['no_unit'])."*{$lambung} — {$status}"];

        if ($keputusan['berbeda_dari_rekomendasi'] ?? false) {
            $lines[] = '⚠️ '.self::overrideNote($keputusan);
        }

        $lines[] = "Driver: {$drivers}";

        if ($keputusan['alasan'] ?? null) {
            $lines[] = 'Alasan: '.self::clean($keputusan['alasan']);
        }

        return [...$lines, ...self::findingsBlock($unit['findings'])];
    }

    private static function overrideNote(array $keputusan): string
    {
        return "_tidak sesuai rekomendasi sistem ({$keputusan['rekomendasi_sistem']})_";
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
            'pic' => fn ($f) => 'PIC: '.($f['pic'] ? self::clean($f['pic']) : '_belum ditunjuk_'),
            'tindakan' => fn ($f) => 'Tindakan: '.($f['tindakan'] ? self::clean($f['tindakan']) : '_belum ditentukan_'),
            'status' => fn ($f) => (self::STATUS_LABEL[$f['status']] ?? $f['status'])
                .($f['target'] ? ' (target '.Carbon::parse($f['target'])->format('d/m').')' : ''),
        ];
        $shared = collect($fields)->filter(fn ($render) => $findings->map($render)->unique()->count() === 1);
        $varying = collect($fields)->diffKeys($shared);

        $lines = ['Temuan ('.$findings->count().'):'];

        foreach ($findings as $f) {
            $notes = collect([
                $f['kode_bahaya'] === 'AA' ? '⛔ *AA*' : null,
                ($f['berulang'] ?? null) ? "berulang {$f['berulang']}x" : null,
                ($f['overdue'] ?? false) ? '*lewat target*' : null,
            ])->filter();

            $line = '- '.self::clean($f['item'])
                .($f['keterangan'] ? ': '.self::clean($f['keterangan']) : '')
                .($notes->isNotEmpty() ? ' _('.$notes->implode(', ').')_' : '');

            if ($varying->isNotEmpty()) {
                $line .= ' → '.$varying->map(fn ($render) => $render($f))->implode(' · ');
            }

            $lines[] = $line;
        }

        if ($shared->isNotEmpty()) {
            $lines[] = $shared->map(fn ($render) => $render($findings->first()))->implode(' · ');
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
