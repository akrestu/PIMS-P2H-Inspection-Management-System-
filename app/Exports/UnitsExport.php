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

        return $this->units->values()->map(function ($unit) {
            return [
                $unit->no_unit,
                $unit->jenis_unit,
                $unit->no_lambung ?? '',
                $unit->status,
                $unit->department ?? '',
            ];
        })->toArray();
    }

    public function headings(): array
    {
        return ['no_unit', 'jenis_unit', 'no_lambung', 'status', 'department'];
    }

    public function title(): string
    {
        return 'Data Unit';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 18,
            'C' => 18,
            'D' => 12,
            'E' => 24,
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
                $sheet->freezePane('A3');

                $sheet->insertNewRowBefore(1, 1);
                $sheet->setCellValue('A1', 'DATA UNIT — Diekspor: ' . now()->setTimezone('Asia/Jakarta')->format('d/m/Y H:i') . ' — File ini dapat langsung digunakan sebagai template import.');
                $sheet->mergeCells('A1:E1');

                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FF7C3A00']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFF3CD']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'wrapText' => true],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(24);
            },
        ];
    }
}
