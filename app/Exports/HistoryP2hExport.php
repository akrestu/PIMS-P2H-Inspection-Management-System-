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

class HistoryP2hExport implements FromArray, WithHeadings, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    public function __construct(
        private array $sessions,
        private array $filters,
    ) {}

    public function array(): array
    {
        $rows = [];
        $no   = 1;

        foreach ($this->sessions as $s) {
            $rows[] = [
                $no++,
                $s['tanggal'],
                $s['no_unit'],
                $s['jenis_unit'],
                $s['slot_terisi'] . 'x P2H',
                $s['total_tl'] > 0 ? $s['total_tl'] . ' item TL' : 'Semua Layak',
                $s['total_tl'] > 0 ? 'Ada TL' : 'Layak',
                ucfirst($s['status']),
            ];
        }

        return $rows;
    }

    public function headings(): array
    {
        return [
            'No.',
            'Tanggal',
            'No. Unit',
            'Jenis Unit',
            'Slot Terisi',
            'Hasil Pemeriksaan',
            'Status Kelayakan',
            'Status Sesi',
        ];
    }

    public function title(): string
    {
        return 'Riwayat P2H';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 5,
            'B' => 13,
            'C' => 16,
            'D' => 16,
            'E' => 12,
            'F' => 22,
            'G' => 17,
            'H' => 13,
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

                $sheet->insertNewRowBefore(1, 3);
                $sheet->setCellValue('A1', 'LAPORAN RIWAYAT P2H (PEMERIKSAAN & PERAWATAN HARIAN)');
                $sheet->setCellValue('A2', 'PT. Wahana Bandhawa Kencana');

                $periodeLabel = 'Semua periode';
                if (!empty($this->filters['date_from']) || !empty($this->filters['date_to'])) {
                    $from = $this->filters['date_from'] ?? '-';
                    $to   = $this->filters['date_to'] ?? '-';
                    $periodeLabel = "Periode: {$from} s/d {$to}";
                }
                if (!empty($this->filters['jenis_unit'])) {
                    $periodeLabel .= ' · ' . $this->filters['jenis_unit'];
                }
                if (!empty($this->filters['no_unit'])) {
                    $periodeLabel .= ' · Unit: ' . $this->filters['no_unit'];
                }
                $sheet->setCellValue('A3', $periodeLabel);

                foreach (['A1', 'A2', 'A3'] as $cell) {
                    $sheet->mergeCells($cell . ':H' . substr($cell, 1));
                }

                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF1E3A5F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A2:A3')->applyFromArray([
                    'font'      => ['size' => 10, 'color' => ['argb' => 'FF555555']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $sheet->freezePane('A5');
            },
        ];
    }
}
