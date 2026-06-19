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

class UsersImportTemplateExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function array(): array
    {
        return [
            ['John Doe', '1234567890', 'john@email.com', 'Password123!', 'driver', 'Non Staff', 'Operasional', 'Bus'],
        ];
    }

    public function headings(): array
    {
        return ['nama_lengkap', 'nik', 'email', 'password', 'role', 'jabatan', 'department', 'jenis_unit'];
    }

    public function title(): string
    {
        return 'Template Import';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 28,
            'B' => 16,
            'C' => 32,
            'D' => 20,
            'E' => 12,
            'F' => 14,
            'G' => 22,
            'H' => 16,
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
                    'A' => 'Nama lengkap (wajib)',
                    'B' => 'NIK / NRPP karyawan (wajib, unik)',
                    'C' => 'Email (opsional)',
                    'D' => 'Password min. 8 karakter (wajib)',
                    'E' => 'admin / manager / driver (wajib)',
                    'F' => 'Sr.Staff / Staff / Non Staff (wajib kecuali role admin)',
                    'G' => 'Nama departemen (wajib kecuali role admin)',
                    'H' => 'Bus atau Light Vehicle (opsional)',
                ];

                $sheet->insertNewRowBefore(1, 1);
                $sheet->setCellValue('A1', 'TEMPLATE IMPORT USER — Hapus baris contoh (baris 3) sebelum upload. Jangan ubah baris heading (baris 2).');
                $sheet->mergeCells('A1:H1');
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
