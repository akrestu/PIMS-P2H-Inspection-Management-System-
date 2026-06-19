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

class UsersExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function __construct(private Collection $users) {}

    public function array(): array
    {
        if ($this->users->isEmpty()) {
            return [];
        }

        return $this->users->values()->map(function ($user, $index) {
            $role = $user->roles->first()?->name ?? '';

            return [
                $index + 1,
                $user->name,
                $user->nik ?? '',
                $user->email ?? '',
                $role,
                $user->jabatan ?? '',
                $user->department ?? '',
                $user->jenis_unit ?? '',
                $user->created_at?->format('d/m/Y H:i') ?? '',
            ];
        })->toArray();
    }

    public function headings(): array
    {
        return ['No', 'Nama Lengkap', 'NIK / NRPP', 'Email', 'Role', 'Jabatan', 'Departemen', 'Jenis Unit', 'Tanggal Dibuat'];
    }

    public function title(): string
    {
        return 'Data Users';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 6,
            'B' => 28,
            'C' => 18,
            'D' => 32,
            'E' => 12,
            'F' => 14,
            'G' => 22,
            'H' => 16,
            'I' => 18,
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
                $sheet->setCellValue('A1', 'DATA USER — PT. Wahana Bandhawa Kencana');
                $sheet->setCellValue('A2', 'Diekspor: ' . now()->setTimezone('Asia/Jakarta')->format('d/m/Y H:i'));
                $sheet->mergeCells('A1:I1');
                $sheet->mergeCells('A2:I2');

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
