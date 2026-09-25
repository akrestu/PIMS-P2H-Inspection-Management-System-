<?php

namespace App\Exports;

use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/** Export Monitoring Harian Unit: satu baris = satu unit di satu tanggal (sama dengan tabel web). */
class DailyUnitMonitoringExport implements FromArray, WithEvents, WithTitle
{
    private const HEADER = [
        'Tanggal', 'No. Unit', 'No. Lambung', 'Jenis', 'Site', 'Status P2H', 'Shift', 'Driver',
        'Kondisi', 'Temuan', 'Action / Tindak Lanjut', 'KM', 'BBM (Liter)',
    ];

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, int|float>  $summary
     */
    public function __construct(
        private array $rows,
        private array $summary,
        private string $dateFrom,
        private string $dateTo,
    ) {}

    public function array(): array
    {
        $data = [self::HEADER];

        foreach ($this->rows as $row) {
            $temuan = collect($row['temuan']);

            $data[] = [
                Carbon::parse($row['tanggal'])->format('d/m/Y'),
                $row['no_unit'],
                $row['no_lambung'] ?? '-',
                $row['jenis_unit'],
                $row['site'] ?? '-',
                $row['terisi'] ? ($row['pending_approval'] ? 'Terisi (menunggu approval)' : 'Terisi') : 'Tidak mengisi',
                implode(', ', $row['shifts']) ?: '-',
                implode(', ', $row['drivers']) ?: '-',
                $row['kondisi'] ?? '-',
                $temuan->isEmpty() ? '-' : $temuan->values()->map(fn ($t, $i) => ($i + 1).'. '.$t['item']
                    .($t['kode_bahaya'] === 'AA' ? ' (AA)' : '')
                    .($t['keterangan'] ? ' — '.$t['keterangan'] : ''))->implode("\n"),
                $temuan->isEmpty() ? '-' : $temuan->values()->map(fn ($t, $i) => ($i + 1).'. '
                    .($t['tindakan'] ?: 'Belum ada tindakan')
                    .' ['.($t['status_label'] ?? '-').']'
                    .($t['pic'] ? ' PIC: '.$t['pic'] : ''))->implode("\n"),
                $row['km'] ?? '-',
                $row['bbm_liter'] ?? '-',
            ];
        }

        $data[] = [];
        $data[] = ['RINGKASAN'];
        $data[] = ['Baris unit-hari', $this->summary['total']];
        $data[] = ['Terisi P2H', $this->summary['terisi']];
        $data[] = ['Tidak mengisi', $this->summary['kosong']];
        $data[] = ['Kondisi BD', $this->summary['bd']];
        $data[] = ['Jumlah temuan', $this->summary['temuan']];
        $data[] = ['Total BBM (liter)', $this->summary['bbm_liter']];

        return $data;
    }

    public function title(): string
    {
        return 'Monitoring Harian Unit';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'M';
                $lastDataRow = count($this->rows) + 4;

                $sheet->insertNewRowBefore(1, 3);
                $sheet->setCellValue('A1', 'MONITORING HARIAN UNIT — P2H, TEMUAN, KM & BBM');
                $sheet->setCellValue('A2', 'PT. Wahana Bandhawa Kencana');
                $sheet->setCellValue('A3', 'Periode: '.Carbon::parse($this->dateFrom)->format('d/m/Y').' s/d '.Carbon::parse($this->dateTo)->format('d/m/Y'));
                foreach ([1, 2, 3] as $r) {
                    $sheet->mergeCells("A{$r}:{$lastCol}{$r}");
                }
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A2:A3')->applyFromArray([
                    'font' => ['size' => 10, 'color' => ['argb' => 'FF555555']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $sheet->getStyle("A4:{$lastCol}4")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                ]);

                if ($lastDataRow >= 5) {
                    $sheet->getStyle("A5:{$lastCol}{$lastDataRow}")->applyFromArray([
                        'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFDDDDDD']]],
                    ]);

                    // Tandai hari tanpa P2H (merah muda) dan kondisi BD (oranye)
                    foreach ($this->rows as $i => $row) {
                        $r = $i + 5;
                        if (! $row['terisi']) {
                            $sheet->getStyle("F{$r}")->getFont()->getColor()->setARGB('FFC0392B');
                        }
                        if ($row['kondisi'] === 'BD') {
                            $sheet->getStyle("I{$r}")->getFont()->setBold(true)->getColor()->setARGB('FFD35400');
                        }
                    }
                }

                foreach (['A' => 12, 'B' => 14, 'C' => 12, 'D' => 14, 'E' => 18, 'F' => 16, 'G' => 16, 'H' => 22,
                    'I' => 12, 'J' => 40, 'K' => 44, 'L' => 10, 'M' => 12] as $col => $width) {
                    $sheet->getColumnDimension($col)->setWidth($width);
                }

                $sheet->freezePane('C5');
                $sheet->setAutoFilter("A4:{$lastCol}4");
                $sheet->getStyle('A'.($lastDataRow + 2))->getFont()->setBold(true);
            },
        ];
    }
}
