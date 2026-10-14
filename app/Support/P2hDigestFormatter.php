<?php

namespace App\Support;

use App\Models\AppSetting;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Mengubah hasil DailyP2hDigest menjadi teks Daily Report siap tempel di WhatsApp.
 *
 * Dibuat ringkas untuk grup WhatsApp harian: angka utama di atas, unit
 * dikelompokkan per kondisi (BD → ada temuan → layak → belum P2H), satu temuan
 * satu baris. Detail tindak lanjut (PIC, progress, tindakan) ada di menu Temuan.
 * Tanpa indentasi/garis pemisah karena WhatsApp tidak mempertahankannya.
 */
class P2hDigestFormatter
{
    /** Keterangan yang tidak menambah informasi (item jelas tidak ada/tidak berfungsi) */
    private const EMPTY_NOTES = '/^(n\/?a|-+|\.+|x|kosong|nihil|tidak ada|tdk ada|gak ada|ga ada|tidak|rusak|ok)$/i';

    private const JENIS_SINGKAT = ['Light Vehicle' => 'LV', 'Bus' => 'Bus'];

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

        $lines[] = '';
        if (($digest['pa'] ?? []) !== []) {
            $lines[] = 'PA: '.collect($digest['pa'])
                ->map(fn ($g, $jenis) => (self::JENIS_SINGKAT[$jenis] ?? $jenis).' *'.self::percent($g['pa']).'*'
                    .($g['bd'] > 0 ? " ({$g['bd']} unit tidak Ready)" : ''))
                ->implode(' · ');
        }

        $byDate = collect($digest['units'])->groupBy('tanggal');
        $belum = $digest['belum_p2h'] ?? [];
        $total = $digest['stats']['total_unit'] ?? null;

        // Rentang lebih dari 1 hari → dikelompokkan per tanggal
        foreach (array_keys($belum) ?: $byDate->keys()->all() as $tanggal) {
            $units = $byDate->get($tanggal, collect());
            $missing = $belum[$tanggal] ?? [];
            $notReady = $digest['tidak_ready'][$tanggal] ?? [];

            if ($digest['multi_hari'] ?? false) {
                $lines[] = '';
                $lines[] = '*'.strtoupper(Carbon::parse($tanggal)->locale('id')->translatedFormat('l, d M Y')).'*';
            }
            if ($total !== null) {
                // Unit yang sedang BD/PM/Servis tidak wajib P2H
                $wajib = $total - count($notReady);
                $lines[] = "Sudah P2H: *{$units->count()} dari {$wajib} unit*"
                    .($notReady !== [] ? ' ('.count($notReady).' unit tidak Ready)' : '');
            }

            $lines = [...$lines, ...self::dayLines($units)];

            if ($notReady !== []) {
                $lines[] = '';
                $lines[] = '*TIDAK READY ('.count($notReady).')*';
                $lines[] = collect($notReady)
                    ->sortBy(fn ($u) => preg_replace('/\s+/', '', $u['no_unit']), SORT_NATURAL | SORT_FLAG_CASE)
                    ->map(fn ($u) => self::clean($u['no_unit'])." ({$u['status']})")
                    ->implode(', ');
            }

            if ($missing !== []) {
                $lines[] = '';
                $lines[] = '*BELUM P2H ('.count($missing).')*';
                $lines[] = self::unitList($missing);
            }
        }

        // Keterangan simbol cukup sekali di akhir, hanya bila simbolnya dipakai
        $findings = collect($digest['units'])->flatMap(fn ($u) => $u['findings']);
        $legend = collect([
            $findings->contains(fn ($f) => $f['kode_bahaya'] === 'AA') ? 'AA = bahaya kritis' : null,
            $findings->contains(fn ($f) => $f['berulang'] ?? null) ? 'berulang = item yang sama bermasalah dalam '.config('p2h.findings.recurring_window_days').' hari terakhir' : null,
            $findings->contains(fn ($f) => $f['overdue'] ?? false) ? null : null,
        ])->filter();

        $lines[] = '';
        if ($legend->isNotEmpty()) {
            $lines[] = '_Ket: '.$legend->implode(' · ').'_';
        }
        if ($url = AppSetting::publicReportUrl()) {
            $lines[] = '';
            $lines[] = 'Rekap bulanan: '.$url.'?bulan='.substr($digest['tanggal_selesai'] ?? now()->toDateString(), 0, 7);
        }
        $lines[] = '_Detail tindak lanjut: menu Temuan P2H di PIMS_';

        return implode("\n", $lines);
    }

    /** Satu hari: BD → ada temuan → layak tanpa temuan. */
    private static function dayLines(Collection $units): array
    {
        $isBd = fn ($u) => (($u['keputusan']['final'] ?? null) ?? $u['kondisi_akhir']) === 'BD';
        $bd = $units->filter($isBd)->sortBy('no_unit', SORT_NATURAL)->values();
        $temuan = $units->reject($isBd)->filter(fn ($u) => $u['findings'] !== [])->sortBy('no_unit', SORT_NATURAL)->values();
        $clean = $units->reject($isBd)->filter(fn ($u) => $u['findings'] === [])->values();

        $lines = [];

        if ($bd->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '*BREAKDOWN ('.$bd->count().')*';
            foreach ($bd as $i => $unit) {
                $lines = [...$lines, ...self::unitLines($i + 1, $unit, withReason: true)];
            }
        }

        if ($temuan->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '*LAYAK, ADA TEMUAN ('.$temuan->count().')*';
            foreach ($temuan as $i => $unit) {
                $lines = [...$lines, ...self::unitLines($i + 1, $unit)];
            }
        }

        if ($clean->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '*LAYAK TANPA TEMUAN ('.$clean->count().')*';
            $lines[] = self::unitList($clean->pluck('no_unit')->all());

            // Keputusan yang menyimpang dari rekomendasi sistem tetap perlu terlihat
            foreach ($clean->filter(fn ($u) => $u['keputusan']['berbeda_dari_rekomendasi'] ?? false) as $unit) {
                $lines[] = '*'.self::clean($unit['no_unit']).'*: '.self::overrideNote($unit['keputusan']);
            }
        }

        return $lines;
    }

    /** Nomor unit + driver dalam satu baris, lalu satu baris per temuan. */
    private static function unitLines(int $no, array $unit, bool $withReason = false): array
    {
        $keputusan = $unit['keputusan'] ?? [];
        $drivers = collect($unit['entries'])->pluck('driver')->filter()->map(fn ($d) => self::clean($d))->unique()->implode(', ');

        $lines = ["{$no}. *".self::clean($unit['no_unit']).'*'.($drivers !== '' ? " — {$drivers}" : '')];

        if ($keputusan['berbeda_dari_rekomendasi'] ?? false) {
            $lines[] = self::overrideNote($keputusan);
        }

        // Alasan ditulis untuk unit BD dan keputusan yang menyimpang dari rekomendasi
        if (($withReason || ($keputusan['berbeda_dari_rekomendasi'] ?? false)) && ($keputusan['alasan'] ?? null)) {
            $lines[] = '_Alasan: '.self::clean($keputusan['alasan']).'_';
        }

        // Kode bahaya AA (kritis) selalu di atas
        foreach (collect($unit['findings'])->sortBy(fn ($f) => $f['kode_bahaya'] === 'AA' ? 0 : 1) as $f) {
            $lines[] = self::findingLine($f);
        }

        return $lines;
    }

    private static function findingLine(array $f): string
    {
        $note = self::clean($f['keterangan'] ?? '');
        $markers = collect([
            $f['kode_bahaya'] === 'AA' ? '*AA*' : null,
            ($f['berulang'] ?? null) ? "berulang {$f['berulang']}x" : null,
            ($f['overdue'] ?? false) ? 'lewat target' : null,
        ])->filter();

        return '- '.self::clean($f['item'])
            .($note !== '' && ! preg_match(self::EMPTY_NOTES, $note) ? ": _{$note}_" : '')
            .($markers->isNotEmpty() ? ' ('.$markers->implode(', ').')' : '');
    }

    private static function overrideNote(array $keputusan): string
    {
        return "_Keputusan tidak sesuai rekomendasi sistem ({$keputusan['rekomendasi_sistem']})_";
    }

    /** Daftar nomor unit dalam satu baris, urut alami ("WLV 8" sebelum "WLV 10"). */
    private static function unitList(array $units): string
    {
        return collect($units)
            ->map(fn ($u) => self::clean($u))
            ->sortBy(fn ($u) => preg_replace('/\s+/', '', $u), SORT_NATURAL | SORT_FLAG_CASE)
            ->implode(', ');
    }

    private static function percent(?float $value): string
    {
        return $value !== null ? str_replace('.', ',', (string) $value).'%' : '-';
    }

    /**
     * Teks bebas dari form: buang karakter format WhatsApp (* _ ~ `) agar tidak
     * merusak huruf tebal/miring, misalnya nama item "APAR*".
     */
    private static function clean(?string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', str_replace(['*', '_', '~', '`'], '', (string) $text)));
    }

    /** @param  array{pa: ?float, total: int, bd: int}  $group */
    public static function paLine(string $jenis, array $group): string
    {
        return "- {$jenis}: *".self::percent($group['pa'])."* ({$group['total']} unit, {$group['bd']} tidak Ready)";
    }
}
