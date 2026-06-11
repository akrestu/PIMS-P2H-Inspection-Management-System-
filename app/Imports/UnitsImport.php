<?php

namespace App\Imports;

use App\Models\Unit;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UnitsImport implements ToCollection, WithHeadingRow
{
    private int $successCount = 0;
    private array $rowErrors = [];

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            $noUnit   = trim($row['no_unit'] ?? '');
            $jenisUnit = trim($row['jenis_unit'] ?? '');
            $noLambung = trim($row['no_lambung'] ?? '') ?: null;
            $status   = strtolower(trim($row['status'] ?? 'active'));

            if (empty($noUnit)) {
                $this->rowErrors[] = "Baris {$rowNum}: No. unit wajib diisi.";
                continue;
            }
            if (!in_array($jenisUnit, ['Bus', 'Light Vehicle'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jenis unit '{$jenisUnit}' tidak valid (Bus / Light Vehicle).";
                continue;
            }
            if (!in_array($status, ['active', 'inactive'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Status '{$status}' tidak valid (active / inactive).";
                continue;
            }
            if (Unit::where('no_unit', $noUnit)->exists()) {
                $this->rowErrors[] = "Baris {$rowNum}: No. unit '{$noUnit}' sudah terdaftar.";
                continue;
            }

            try {
                Unit::create([
                    'no_unit'   => $noUnit,
                    'jenis_unit' => $jenisUnit,
                    'no_lambung' => $noLambung,
                    'status'    => $status,
                ]);
                $this->successCount++;
            } catch (\Throwable $e) {
                $this->rowErrors[] = "Baris {$rowNum}: " . $e->getMessage();
            }
        }
    }

    public function successCount(): int
    {
        return $this->successCount;
    }

    public function rowErrors(): array
    {
        return $this->rowErrors;
    }
}
