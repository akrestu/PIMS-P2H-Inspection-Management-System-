<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class MonitoringP2hExport implements FromArray, WithTitle, WithStyles, WithEvents
{
    public function __construct(
        private array $matrix,
        private array $dates,
        private array $columnSummary,
        private array $summary,
        private string $dateFrom,
        private string $dateTo,
    ) {}

    public function array(): array
    {
        $rows = [];

        // Header row: Unit | date1 | date2 | ... | Compliance
        $header = ['No. Unit', 'Jenis', 'No. Lambung'];
        foreach ($this->dates as $date) {
            $header[] = $this->fmtShort($date);
        }
        $header[] = 'Compliance';
        $header[] = 'Hari Isi';
        $header[] = 'Total Hari';
        $rows[] = $header;

        // Data rows
        foreach ($this->matrix as $row) {
            $dataRow = [
                $row['no_unit'],
                $row['jenis_unit'],
                $row['no_lambung'] ?? '-',
            ];
            foreach ($this->dates as $date) {
                $cell = $row['cells'][$date] ?? null;
                $dataRow[] = $cell ? $this->cellLabel($cell) : '-';
            }
            $dataRow[] = $row['compliance_pct'] . '%';
            $dataRow[] = $row['filled_days'];
            $dataRow[] = $row['total_days'];
            $rows[] = $dataRow;
        }

        // Footer: totals per date
        $totalRow = ['TOTAL', '', ''];
        foreach ($this->dates as $date) {
            $col = $this->columnSummary[$date];
            $totalRow[] = $col['filled'] . '/' . $col['total'];
        }
        $totalRow[] = $this->summary['fleet_compliance'] . '%';
        $totalRow[] = '';
        $totalRow[] = '';
        $rows[] = $totalRow;

        // Summary section
        $rows[] = [];
        $rows[] = ['RINGKASAN'];
        $rows[] = ['Fleet Compliance', $this->summary['fleet_compliance'] . '%'];
        $rows[] = ['Unit Sempurna (100%)', $this->summary['perfect_units']];
        $rows[] = ['Total Hari Kosong', $this->summary['total_missed']];
        $rows[] = ['Total Hari BD', $this->summary['total_bd_days']];

        return $rows;
    }

    public function title(): string
    {
        return 'Monitoring P2H';
    }

    public function styles(Worksheet $sheet): array
    {
        return [];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $totalCols = 3 + count($this->dates) + 3; // unit cols + dates + compliance+filled+total
                $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalCols);

                // Insert title rows
                $sheet->insertNewRowBefore(1, 3);
                $sheet->setCellValue('A1', 'LAPORAN MONITORING P2H — COMPLIANCE MATRIX');
                $sheet->setCellValue('A2', 'PT. Wahana Bandhawa Kencana');
                $sheet->setCellValue('A3', 'Periode: ' . $this->dateFrom . ' s/d ' . $this->dateTo);

                foreach (['A1', 'A2', 'A3'] as $cell) {
                    $sheet->mergeCells($cell . ':' . $lastCol . substr($cell, 1));
                }

                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A2:A3')->applyFromArray([
                    'font'      => ['size' => 10, 'color' => ['argb' => 'FF555555']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Style header row (row 4 after insert)
                $headerRow = 4;
                $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
                ]);

                // Freeze first column
                $sheet->freezePane('D5');

                // Auto-width for first 3 cols
                $sheet->getColumnDimension('A')->setWidth(18);
                $sheet->getColumnDimension('B')->setWidth(14);
                $sheet->getColumnDimension('C')->setWidth(13);

                // Date columns: narrow
                $colIdx = 4;
                foreach ($this->dates as $_) {
                    $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
                    $sheet->getColumnDimension($col)->setWidth(10);
                    $colIdx++;
                }

                // Compliance col
                $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
                $sheet->getColumnDimension($col)->setWidth(13);
                $sheet->getColumnDimension(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1))->setWidth(10);
                $sheet->getColumnDimension(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 2))->setWidth(10);
            },
        ];
    }

    private function fmtShort(string $date): string
    {
        [$y, $m, $d] = explode('-', $date);
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return $d . ' ' . ($months[(int)$m - 1] ?? $m);
    }

    private function cellLabel(array $cell): string
    {
        $label = $cell['slots_filled'] . '/4';
        $label .= match ($cell['status']) {
            'layak'   => ' ✓',
            'bd'      => ' BD',
            'partial' => ' ~',
            default   => '',
        };
        return $label;
    }
}
