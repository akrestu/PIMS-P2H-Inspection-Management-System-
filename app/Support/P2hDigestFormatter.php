<?php

namespace App\Support;

use App\Http\Controllers\PublicReportController;
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
        $jenis = $digest['jenis_unit'] ?? null;
        $judul = $jenis ? strtoupper(self::JENIS_SINGKAT[$jenis] ?? $jenis) : 'UNIT';
        $scope = collect([
            $digest['site'] ? "Site {$digest['site']}" : null,
            $digest['tanggal_label'],
        ])->filter()->implode(' · ');

        $lines = [
            "*DAILY REPORT MONITORING {$judul}*",
            "_{$scope}_",
        ];

        $byDate = collect($digest['units'])->groupBy('tanggal');
        $dates = array_keys($digest['belum_p2h'] ?? []) ?: $byDate->keys()->all();
        $multi = $digest['multi_hari'] ?? false;
        $lastDay = null;

        foreach ($dates as $tanggal) {
            $day = self::classify($byDate->get($tanggal, collect()), $digest, $tanggal);
            $lastDay = $day;

            if ($multi) {
                $lines[] = '';
                $lines[] = '*'.strtoupper(Carbon::parse($tanggal)->locale('id')->translatedFormat('l, d M Y')).'*';
            }

            $lines = [...$lines, ...self::overviewLines($digest, $day, withPa: ! $multi)];
            $lines = [...$lines, ...self::sectionLines($day)];
        }

        if ($multi && ($digest['pa'] ?? []) !== []) {
            $lines[] = '';
            $lines[] = self::paSummary($digest['pa']);
        }

        // Arahan disusun dari kondisi hari terakhir pada rentang laporan
        if ($lastDay !== null && ($tindak = self::actionLines($lastDay)) !== []) {
            $lines[] = '';
            $lines[] = '*CORRECTIVE ACTION*';
            $lines = [...$lines, ...$tindak];
        }

        // Keterangan simbol cukup sekali di akhir, hanya bila simbolnya dipakai
        $findings = collect($digest['units'])->flatMap(fn ($u) => $u['findings']);
        $legend = collect([
            $findings->contains(fn ($f) => $f['kode_bahaya'] === 'AA') ? 'AA = bahaya kritis' : null,
            $findings->contains(fn ($f) => $f['berulang'] ?? null) ? 'berulang = item yang sama bermasalah dalam '.config('p2h.findings.recurring_window_days').' hari terakhir' : null,
        ])->filter();

        $lines[] = '';
        if ($legend->isNotEmpty()) {
            $lines[] = '_Ket: '.$legend->implode(' · ').'_';
        }
        if ($url = AppSetting::publicReportUrl()) {
            // Link membawa filter laporan yang sama (bulan, jenis unit, site)
            $query = array_filter([
                'bulan' => substr($digest['tanggal_selesai'] ?? now()->toDateString(), 0, 7),
                'jenis' => array_search($jenis, PublicReportController::JENIS, true) ?: null,
                'site' => $digest['site_id'] ?? null,
            ]);
            $lines[] = 'Rekap bulanan: '.$url.'?'.http_build_query($query);
        }
        $lines[] = '';
        $lines[] = 'Terima kasih.';

        return implode("\n", $lines);
    }

    /**
     * Kelompokkan unit satu hari: layak, ada temuan, BD (hasil P2H maupun downtime
     * berjalan), dan belum P2H.
     */
    private static function classify(Collection $units, array $digest, string $tanggal): array
    {
        $isBd = fn ($u) => (($u['keputusan']['final'] ?? null) ?? $u['kondisi_akhir']) === 'BD';
        $sort = fn (Collection $c) => $c->sortBy(fn ($u) => preg_replace('/\s+/', '', (string) $u['no_unit']), SORT_NATURAL | SORT_FLAG_CASE)->values();

        // Unit BD hasil P2H hari itu + unit yang sedang BD/PM/Servis tanpa P2H
        $bd = $units->filter($isBd)->map(fn ($u) => [
            'no_unit' => $u['no_unit'],
            'status' => 'BD',
            'hari' => $u['bd_hari'] ?? null,
            'sejak' => $u['bd_sejak'] ?? null,
            'keterangan' => null,
            'progress' => $u['bd_progress'] ?? null,
            'unit' => $u,
        ])->concat(collect($digest['tidak_ready'][$tanggal] ?? [])->map(fn ($u) => [
            'hari' => null, 'sejak' => null, 'keterangan' => null, 'progress' => null, ...$u, 'unit' => null,
        ]));

        $ok = $units->reject($isBd);

        return [
            'sudah' => $units->count(),
            'layak' => $sort($ok->filter(fn ($u) => $u['findings'] === [])),
            'temuan' => $sort($ok->filter(fn ($u) => $u['findings'] !== [])),
            // BD terlama di atas agar paling cepat terlihat; durasi sama → urut nomor unit
            'bd' => $sort($bd)->sortByDesc(fn ($b) => $b['hari'] ?? -1)->values(),
            'belum' => $digest['belum_p2h'][$tanggal] ?? [],
            'belum_hari' => $digest['belum_p2h_hari'][$tanggal] ?? [],
            'tidak_ready' => count($digest['tidak_ready'][$tanggal] ?? []),
        ];
    }

    /** Angka utama: PA dan kepatuhan P2H (jumlah per kondisi ada di judul tiap bagian). */
    private static function overviewLines(array $digest, array $day, bool $withPa): array
    {
        $lines = [''];
        if ($withPa && ($digest['pa'] ?? []) !== []) {
            $lines[] = self::paSummary($digest['pa']);
        }

        if (($digest['stats']['total_unit'] ?? null) !== null) {
            // Unit yang sedang BD/PM/Servis tanpa P2H tidak wajib P2H
            $wajib = $digest['stats']['total_unit'] - $day['tidak_ready'];
            $persen = $wajib > 0 ? ' ('.round($day['sudah'] / $wajib * 100).'%)' : '';
            $lines[] = "Sudah P2H: *{$day['sudah']} dari {$wajib} unit{$persen}*";
        }

        return $lines;
    }

    private static function paSummary(array $pa): string
    {
        return collect($pa)
            ->map(fn ($g, $jenis) => 'PA '.(self::JENIS_SINGKAT[$jenis] ?? $jenis).': *'.self::percent($g['pa']).'*')
            ->implode(' · ');
    }

    /** Urutan bagian: sudah P2H (temuan dulu) → BD → belum P2H. */
    private static function sectionLines(array $day): array
    {
        $lines = [];

        if ($day['sudah'] > 0) {
            $lines[] = '';
            $lines[] = "*1. SUDAH P2H ({$day['sudah']})*";

            if ($day['temuan']->isNotEmpty()) {
                $lines[] = '_Ada temuan:_';
                foreach ($day['temuan'] as $i => $unit) {
                    $lines = [...$lines, ...self::unitLines($i + 1, $unit)];
                }
            }

            if ($day['layak']->isNotEmpty()) {
                if ($day['temuan']->isNotEmpty()) {
                    $lines[] = '';
                }
                $lines[] = '_Layak tanpa temuan:_ '.self::unitList($day['layak']->pluck('no_unit')->all());

                // Keputusan yang menyimpang dari rekomendasi sistem tetap perlu terlihat
                foreach ($day['layak']->filter(fn ($u) => $u['keputusan']['berbeda_dari_rekomendasi'] ?? false) as $unit) {
                    $lines[] = '*'.self::clean($unit['no_unit']).'*: '.self::overrideNote($unit['keputusan']);
                }
            }

            $bdP2h = $day['bd']->filter(fn ($b) => $b['unit'] !== null)->count();
            if ($bdP2h > 0) {
                $lines[] = "_Hasil P2H BD: {$bdP2h} unit (lihat bagian 2)_";
            }
        }

        if ($day['bd']->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '*2. UNIT BD / TIDAK READY ('.$day['bd']->count().')*';
            foreach ($day['bd'] as $i => $bd) {
                $lines = [...$lines, ...self::bdLines($i + 1, $bd)];
            }
        }

        if ($day['belum'] !== []) {
            $lines[] = '';
            $lines[] = '*3. BELUM P2H ('.count($day['belum']).')*';
            $lines[] = self::missingList($day);
        }

        return $lines;
    }

    /**
     * Daftar unit belum P2H; unit yang sudah 2 hari atau lebih tidak P2H diberi
     * tanda lama hari (">30 hari" bila tidak ada P2H dalam riwayat).
     */
    private static function missingList(array $day): string
    {
        return collect($day['belum'])
            ->sortBy(fn ($u) => preg_replace('/\s+/', '', $u), SORT_NATURAL | SORT_FLAG_CASE)
            ->map(function ($u) use ($day) {
                $hari = array_key_exists($u, $day['belum_hari']) ? $day['belum_hari'][$u] : 1;

                return self::clean($u).match (true) {
                    $hari === null => ' (>30 hari)',
                    $hari >= 2 => " ({$hari} hari)",
                    default => '',
                };
            })
            ->implode(', ');
    }

    /** Satu unit BD: status + sejak kapan + lama BD, lalu keterangan/temuan. */
    private static function bdLines(int $no, array $bd): array
    {
        $durasi = match (true) {
            $bd['hari'] === null => null,
            $bd['hari'] === 0 => 'mulai hari ini',
            default => "{$bd['hari']} hari",
        };
        $sejak = $bd['sejak'] ? 'sejak '.Carbon::parse($bd['sejak'])->locale('id')->translatedFormat('d M') : null;
        $info = collect([$sejak, $durasi])->filter()->implode(', ');

        $lines = ["{$no}. *".self::clean($bd['no_unit'])."* — {$bd['status']}".($info !== '' ? " ({$info})" : '')];

        // Progress perbaikan dari log downtime, baris tersendiri di bawah penyebab
        $progress = filled($bd['progress']) ? ['Progress: '.self::clean($bd['progress'])] : [];

        if ($bd['unit'] === null) {
            if (filled($bd['keterangan'])) {
                $lines[] = '_'.self::clean($bd['keterangan']).'_';
            }

            return [...$lines, ...$progress];
        }

        // BD hasil P2H hari itu: alasan + temuan penyebabnya (tanpa ulang nomor unit)
        $lines[] = '_Hasil P2H hari ini: BD_';

        return [...$lines, ...array_slice(self::unitLines(0, $bd['unit'], withReason: true), 1), ...$progress];
    }

    /**
     * Fakta hari terakhir laporan sebagai bahan AI menyusun arahan tindak lanjut.
     * AI hanya boleh memakai angka/nomor unit yang ada di sini.
     */
    public static function actionFacts(array $digest): string
    {
        $byDate = collect($digest['units'])->groupBy('tanggal');
        $tanggal = collect(array_keys($digest['belum_p2h'] ?? []) ?: $byDate->keys()->all())->last();
        if ($tanggal === null) {
            return '';
        }
        $day = self::classify($byDate->get($tanggal, collect()), $digest, $tanggal);

        $lines = ['Jenis unit: '.($digest['jenis_unit'] ?? 'Semua'), 'Tanggal: '.$tanggal];
        $lines[] = 'Belum P2H ('.count($day['belum']).'): '.(self::unitList($day['belum']) ?: '-');
        $lines[] = 'Unit dengan temuan ('.$day['temuan']->count().'):';
        foreach ($day['temuan'] as $u) {
            $lines[] = '- '.self::clean($u['no_unit']).': '.collect($u['findings'])
                ->map(fn ($f) => self::clean($f['item']).($f['kode_bahaya'] === 'AA' ? ' [AA]' : '').(($f['overdue'] ?? false) ? ' [lewat target]' : ''))
                ->implode('; ');
        }
        $lines[] = 'Unit BD/tidak Ready ('.$day['bd']->count().'):';
        foreach ($day['bd'] as $b) {
            $lines[] = '- '.self::clean($b['no_unit'])." {$b['status']}".($b['hari'] !== null ? ", {$b['hari']} hari" : '')
                .($b['unit'] ? ', BD dari hasil P2H hari ini' : '')
                .(filled($b['keterangan']) ? ', penyebab: '.self::clean($b['keterangan']) : '')
                .(filled($b['progress']) ? ', progress: '.self::clean($b['progress']) : '');
        }

        return implode("\n", $lines);
    }

    /** Ganti isi bagian CORRECTIVE ACTION dengan baris arahan lain (mis. dari AI). */
    public static function replaceActions(string $text, array $actions): string
    {
        return preg_replace_callback('/(\*CORRECTIVE ACTION\*\n)((?:- .*\n?)+)/u', fn ($m) => $m[1].implode("\n", $actions)."\n", $text, 1);
    }

    /** Arahan singkat dan deterministik untuk tim lapangan. */
    private static function actionLines(array $day): array
    {
        $lines = [];

        if ($day['belum'] !== []) {
            $lines[] = '- Segera P2H '.count($day['belum']).' unit yang belum P2H sebelum unit dioperasikan.';
        }

        if ($day['temuan']->isNotEmpty()) {
            $aa = $day['temuan']->sum(fn ($u) => collect($u['findings'])->where('kode_bahaya', 'AA')->count());
            $lines[] = '- Tindak lanjuti temuan pada '.$day['temuan']->count().' unit'
                .($aa > 0 ? " ({$aa} temuan AA, prioritaskan sebelum unit jalan)" : '').'.';
        }

        if ($day['bd']->isNotEmpty()) {
            $terlama = $day['bd']->filter(fn ($b) => $b['hari'] !== null)->sortByDesc('hari')->first();
            $lines[] = '- Pantau perbaikan '.$day['bd']->count().' unit BD/tidak Ready'
                .($terlama && $terlama['hari'] > 0 ? '; terlama '.self::clean($terlama['no_unit'])." ({$terlama['hari']} hari)" : '').'.';
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
