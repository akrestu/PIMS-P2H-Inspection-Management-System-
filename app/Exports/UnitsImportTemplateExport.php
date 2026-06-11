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
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class UnitsImportTemplateExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function array(): array
    {
        return [
            ['LV-001', 'Light Vehicle', 'B-1234-XYZ', 'active'],
            ['BUS-001', 'Bus', 'B-5678-ABC', 'active'],
        ];
    }

    public function headings(): array
    {
        return ['no_unit', 'jenis_unit', 'no_lambung', 'status'];
    }

    public function title(): string
    {
        return 'Template Import';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 16,
            'B' => 18,
            'C' => 18,
            'D' => 12,
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

                $notes = [
                    'A' => 'No. unit (wajib, unik) — contoh: LV-001',
                    'B' => 'Bus atau Light Vehicle (wajib)',
                    'C' => 'No. polisi (opsional)',
                    'D' => 'active atau inactive (wajib)',
                ];

                $sheet->insertNewRowBefore(1, 1);
                $sheet->setCellValue('A1', 'TEMPLATE IMPORT UNIT — Hapus baris contoh (baris 3–4) sebelum upload. Jangan ubah baris heading (baris 2).');
                $sheet->mergeCells('A1:D1');
                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FF7C3A00']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFF3CD']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'wrapText' => true],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(30);

                $lastDataRow = $sheet->getHighestRow();
                $noteRow = $lastDataRow + 2;
                $sheet->setCellValue("A{$noteRow}", 'Keterangan Kolom:');
                $sheet->getStyle("A{$noteRow}")->getFont()->setBold(true);
                foreach ($notes as $col => $note) {
                    $r = $noteRow + 1 + (ord($col) - ord('A'));
                    $sheet->setCellValue("A{$r}", $sheet->getCell("{$col}2")->getValue() . ' → ' . $note);
                }
            },
        ];
    }
}
