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

        // Keterangan simbol hanya bila simbolnya dipakai di laporan
        $findings = collect($digest['units'])->flatMap(fn ($u) => $u['findings']);
        $legend = collect([
            $findings->contains(fn ($f) => $f['kode_bahaya'] === 'AA') ? '⛔ AA = bahaya kritis' : null,
            $findings->contains(fn ($f) => $f['berulang'] ?? null) ? '🔁 = berulang dalam '.config('p2h.findings.recurring_window_days').' hari' : null,
            $findings->contains(fn ($f) => $f['overdue'] ?? false) ? '⏰ = lewat target' : null,
        ])->filter();

        $lines[] = '';
        $lines[] = '━━━━━━━━━━━━━━━';
        if ($legend->isNotEmpty()) {
            $lines[] = '_'.$legend->implode(' · ').'_';
        }
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
        $lambung = $unit['no_lambung'] ? ' · '.self::clean($unit['no_lambung']) : '';
        $drivers = collect($unit['entries'])
            ->map(fn ($e) => self::clean($e['driver'] ?? '-').($e['shift'] ? " ({$e['shift']})" : ''))
            ->unique()
            ->implode(', ');

        $lines = [
            "{$no}. {$icon} *".self::clean($unit['no_unit'])."*{$lambung}",
            "   {$unit['jenis_unit']} · {$drivers}",
            ...self::decisionLines($unit['keputusan'] ?? null),
        ];

        if ($unit['findings'] === []) {
            $lines[] = '   ✔️ Tidak ada temuan';

            return $lines;
        }

        return [...$lines, '', ...self::findingsBlock($unit['findings'])];
    }

    /** Keputusan final unit (BD / Layak Pakai), pembanding rekomendasi sistem, dan alasannya. */
    private static function decisionLines(?array $keputusan): array
    {
        if (! $keputusan || ! $keputusan['final']) {
            return [];
        }

        $label = $keputusan['final'] === 'BD' ? '*BD — Tidak Layak Operasi*' : '*Layak Pakai*';
        $rekomendasi = match (true) {
            $keputusan['rekomendasi_sistem'] === null => '',
            $keputusan['berbeda_dari_rekomendasi'] => " _(⚠️ berbeda dari rekomendasi sistem: {$keputusan['rekomendasi_sistem']})_",
            default => ' _(sesuai rekomendasi sistem)_',
        };

        return array_filter([
            "   ⚖️ {$label}{$rekomendasi}",
            $keputusan['alasan'] ? '   📝 '.self::clean($keputusan['alasan']) : null,
        ]);
    }

    /**
     * Daftar temuan satu unit. PIC, tindakan, dan status yang sama untuk semua
     * temuan ditulis sekali di bawah daftar; yang berbeda ditulis per temuan.
     */
    private static function findingsBlock(array $findings): array
    {
        // Kode bahaya AA (kritis) selalu di atas
        $findings = collect($findings)->sortBy(fn ($f) => $f['kode_bahaya'] === 'AA' ? 0 : 1)->values();

        $fields = [
            'pic' => fn ($f) => '👤 PIC: '.($f['pic'] ? self::clean($f['pic']) : '_Belum ditunjuk_'),
            'tindakan' => fn ($f) => '🛠️ Tindakan: '.($f['tindakan'] ? self::clean($f['tindakan']) : '_Belum ditentukan_'),
            'status' => fn ($f) => '📌 Status: '.(self::STATUS_LABEL[$f['status']] ?? $f['status'])
                .($f['target'] ? ' · target '.Carbon::parse($f['target'])->format('d/m/Y') : ''),
        ];
        $shared = collect($fields)->filter(fn ($render) => $findings->map($render)->unique()->count() === 1);
        $varying = collect($fields)->diffKeys($shared);

        $lines = ['   🔧 *Temuan ('.$findings->count().')*'];

        foreach ($findings as $i => $f) {
            $tags = collect([
                $f['kode_bahaya'] === 'AA' ? '⛔ *AA*' : null,
                ($f['berulang'] ?? null) ? "🔁{$f['berulang']}x" : null,
                ($f['overdue'] ?? false) ? '⏰' : null,
            ])->filter()->implode(' ');

            $lines[] = '   '.($i + 1).'. '.self::clean($f['item'])
                .($f['keterangan'] ? ' — '.self::clean($f['keterangan']) : '')
                .($tags ? " {$tags}" : '');

            if ($varying->isNotEmpty()) {
                $lines[] = '       ↳ '.$varying->map(fn ($render) => $render($f))->implode(' · ');
            }
        }

        if ($shared->isNotEmpty()) {
            $lines[] = '';
            foreach ($shared as $render) {
                $lines[] = '   '.$render($findings->first());
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
            return "• 🔴 *{$unit['no_unit']}* - TERLAMBAT servis {$km(abs($unit['sisa_km']))} km (jadwal {$km($unit['km_servis_berikutnya'])}, saat ini {$km($unit['km_saat_ini'])})";
        }

        $estimasi = $unit['estimasi_hari'] ? " (±{$unit['estimasi_hari']} hari)" : '';

        return "• 🟡 *{$unit['no_unit']}* - servis dalam {$km($unit['sisa_km'])} km{$estimasi} (jadwal {$km($unit['km_servis_berikutnya'])})";
    }
}
