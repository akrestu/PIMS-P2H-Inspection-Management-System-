<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class MonitoringPaExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function __construct(
        private array $unitData,
        private array $summary,
        private string $dateFrom,
        private string $dateTo,
    ) {}

    public function array(): array
    {
        $rows = [];

        foreach ($this->unitData as $unit) {
            $rows[] = [
                $unit['no_unit'],
                $unit['jenis_unit'],
                $unit['no_lambung'] ?? '-',
                $unit['actual_pa'] !== null ? $unit['actual_pa'] . '%' : '-',
                $unit['compliance_pa'] !== null ? $unit['compliance_pa'] . '%' : '-',
                $this->statusLabel($unit['current_status']),
                $unit['working_hours'],
                $unit['downtime_hours'],
                $unit['operation_days'],
                $unit['bd_days'],
                $unit['total_tl'],
                $unit['latest_date'] ?? '-',
            ];
        }

        // Blank row + summary
        $rows[] = [];
        $rows[] = ['RINGKASAN FLEET', '', '', '', '', '', '', '', '', '', '', ''];
        $rows[] = ['PA Aktual Fleet', $this->summary['fleet_actual_pa'] !== null ? $this->summary['fleet_actual_pa'] . '%' : '-'];
        $rows[] = ['Kelayakan P2H Fleet', $this->summary['fleet_compliance_pa'] !== null ? $this->summary['fleet_compliance_pa'] . '%' : '-'];
        $rows[] = ['Total Unit', $this->summary['total_units']];
        $rows[] = ['Unit Operation', $this->summary['operation_count']];
        $rows[] = ['Unit Breakdown', $this->summary['bd_count']];
        $rows[] = ['Unit No Data', $this->summary['no_data_count']];

        return $rows;
    }

    public function headings(): array
    {
        return [
            'No. Unit',
            'Jenis Unit',
            'No. Lambung',
            'PA Aktual',
            'Kelayakan P2H',
            'Status Saat Ini',
            'Working Hours (j)',
            'Downtime Hours (j)',
            'Hari Operation',
            'Hari BD',
            'Total Item TL',
            'Terakhir P2H',
        ];
    }

    public function title(): string
    {
        return 'Monitoring PA';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 16,
            'C' => 14,
            'D' => 13,
            'E' => 15,
            'F' => 18,
            'G' => 18,
            'H' => 19,
            'I' => 15,
            'J' => 10,
            'K' => 14,
            'L' => 16,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();

                // Freeze header row
                $sheet->freezePane('A2');

                // Add info rows at top (insert 3 rows before data)
                $sheet->insertNewRowBefore(1, 3);
                $sheet->setCellValue('A1', 'LAPORAN MONITORING PA (PHYSICAL AVAILABILITY)');
                $sheet->setCellValue('A2', 'PT. Wahana Bandhawa Kencana');
                $sheet->setCellValue('A3', 'Periode: ' . $this->dateFrom . ' s/d ' . $this->dateTo);
                $sheet->mergeCells('A1:L1');
                $sheet->mergeCells('A2:L2');
                $sheet->mergeCells('A3:L3');

                $titleStyle = [
                    'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ];
                $sheet->getStyle('A1')->applyFromArray($titleStyle);
                $sheet->getStyle('A2:A3')->applyFromArray([
                    'font'      => ['size' => 10, 'color' => ['argb' => 'FF555555']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
            },
        ];
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'operation' => 'Operation',
            'bd'        => 'Breakdown',
            default     => 'No Data',
        };
    }
}
