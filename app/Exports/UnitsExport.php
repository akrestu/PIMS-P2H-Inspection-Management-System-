<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class UnitsExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function __construct(private Collection $units) {}

    public function array(): array
    {
        if ($this->units->isEmpty()) {
            return [];
        }

        return $this->units->values()->map(function ($unit, $index) {
            return [
                $index + 1,
                $unit->no_unit,
                $unit->jenis_unit,
                $unit->no_lambung ?? '',
                $unit->status,
                $unit->created_at?->format('d/m/Y H:i') ?? '',
            ];
        })->toArray();
    }

    public function headings(): array
    {
        return ['No', 'No. Unit', 'Jenis Unit', 'No. Polisi', 'Status', 'Tanggal Dibuat'];
    }

    public function title(): string
    {
        return 'Data Unit';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 6,
            'B' => 16,
            'C' => 18,
            'D' => 18,
            'E' => 12,
            'F' => 18,
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
                $sheet->freezePane('A2');

                $sheet->insertNewRowBefore(1, 2);
                $sheet->setCellValue('A1', 'DATA UNIT — PT. Wahana Bandhawa Kencana');
                $sheet->setCellValue('A2', 'Diekspor: ' . now()->setTimezone('Asia/Jakarta')->format('d/m/Y H:i'));
                $sheet->mergeCells('A1:F1');
                $sheet->mergeCells('A2:F2');

                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A2')->applyFromArray([
                    'font'      => ['size' => 10, 'color' => ['argb' => 'FF555555']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
            },
        ];
    }
}
