<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Mengubah hasil DailyP2hDigest menjadi teks Daily Report siap tempel di WhatsApp.
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
            '_Pemeriksaan Harian Kendaraan_',
            "📅 {$digest['tanggal_label']}",
            "🚙 {$scope}",
            '━━━━━━━━━━━━━━━',
            '',
            '*A. UNIT TELAH P2H*',
        ];

        if ($digest['units'] === []) {
            $lines[] = '_Tidak ada unit yang melakukan P2H pada periode ini._';
        }

        // Rentang lebih dari 1 hari → dikelompokkan per tanggal P2H
        foreach (collect($digest['units'])->groupBy('tanggal') as $tanggal => $units) {
            if ($digest['multi_hari'] ?? false) {
                $lines[] = '';
                $lines[] = '🗓️ _'.Carbon::parse($tanggal)->locale('id')->translatedFormat('l, d F Y').'_';
            }

            foreach ($units->values() as $i => $unit) {
                $lines = [...$lines, '', ...self::unitLines($i + 1, $unit)];
            }
        }

        if (($digest['servis'] ?? []) !== []) {
            $lines[] = '';
            $lines[] = '*B. JADWAL SERVIS BERKALA*';
            $lines[] = '';

            foreach ($digest['servis'] as $unit) {
                $lines[] = self::serviceLine($unit);
            }
        }

        $lines[] = '';
        $lines[] = '━━━━━━━━━━━━━━━';
        $lines[] = '_PIMS - P2H Management System_';

        return implode("\n", $lines);
    }

    private static function unitLines(int $no, array $unit): array
    {
        $icon = match ($unit['kondisi']) {
            'tidak_layak' => '❌',
            'temuan' => '⚠️',
            default => '✅',
        };
        $lambung = $unit['no_lambung'] ? " ({$unit['no_lambung']})" : '';
        $drivers = collect($unit['entries'])
            ->map(fn ($e) => trim(($e['driver'] ?? '-').($e['shift'] ? " - {$e['shift']}" : '')))
            ->unique()
            ->implode(', ');

        $lines = [
            "{$no}. {$icon} *{$unit['no_unit']}*{$lambung}",
            "   {$unit['jenis_unit']} | {$drivers}",
            ...self::decisionLines($unit['keputusan'] ?? null),
        ];

        if ($unit['findings'] === []) {
            $lines[] = '   Tidak ada temuan.';
        }

        foreach ($unit['findings'] as $finding) {
            $lines = [...$lines, ...self::findingLines($finding)];
        }

        return $lines;
    }

    /** Keputusan final unit (BD / Layak Pakai), pembanding rekomendasi sistem, dan alasannya. */
    private static function decisionLines(?array $keputusan): array
    {
        if (! $keputusan || ! $keputusan['final']) {
            return [];
        }

        $label = $keputusan['final'] === 'BD' ? '❌ *BD (Tidak Layak Operasi)*' : '✅ *Layak Pakai*';
        $rekomendasi = match (true) {
            $keputusan['rekomendasi_sistem'] === null => '',
            $keputusan['berbeda_dari_rekomendasi'] => " _(berbeda dari rekomendasi sistem: {$keputusan['rekomendasi_sistem']})_",
            default => ' _(sesuai rekomendasi sistem)_',
        };

        return array_filter([
            "   ⚖️ Keputusan : {$label}{$rekomendasi}",
            $keputusan['alasan'] ? "   📝 Alasan : {$keputusan['alasan']}" : null,
        ]);
    }

    private static function findingLines(array $finding): array
    {
        $kode = $finding['kode_bahaya'] ? " [{$finding['kode_bahaya']}]" : '';
        $status = self::STATUS_LABEL[$finding['status']] ?? $finding['status'];
        $target = $finding['target'] ? ' (target '.Carbon::parse($finding['target'])->format('d/m/Y').')' : '';

        $flags = collect([
            ($finding['overdue'] ?? false) ? '⏰ *Lewat target*' : null,
            ($finding['berulang'] ?? null) ? "🔁 *Berulang {$finding['berulang']}x / ".config('p2h.findings.recurring_window_days').' hari*' : null,
        ])->filter();

        return [
            "   🔧 Temuan : {$finding['item']}{$kode}".($finding['keterangan'] ? " - {$finding['keterangan']}" : ''),
            '   👤 PIC : '.($finding['pic'] ?: 'Belum ditunjuk'),
            '   🛠️ Tindakan : '.($finding['tindakan'] ?: 'Belum ditentukan'),
            "   📌 Progress : {$status}{$target}",
            ...($flags->isNotEmpty() ? ['   '.$flags->implode(' | ')] : []),
        ];
    }

    public static function serviceLine(array $unit): string
    {
        $km = fn (?int $v) => $v === null ? '-' : number_format($v, 0, ',', '.');

        if ($unit['status'] === 'overdue') {
            return "• 🔴 *{$unit['no_unit']}* - TERLAMBAT servis {$km(abs($unit['sisa_km']))} km (jadwal {$km($unit['km_servis_berikutnya'])}, saat ini {$km($unit['km_saat_ini'])})";
        }

        $estimasi = $unit['estimasi_hari'] ? " (±{$unit['estimasi_hari']} hari)" : '';

        return "• 🟡 *{$unit['no_unit']}* - servis dalam {$km($unit['sisa_km'])} km{$estimasi} (jadwal {$km($unit['km_servis_berikutnya'])})";
    }
}
