<?php

namespace App\Imports;

use App\Models\Unit;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UnitsImport implements ToCollection, WithHeadingRow
{
    private int $successCount = 0;
    private int $updateCount  = 0;
    private array $rowErrors  = [];

    public function headingRow(): int { return 2; }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNum    = $index + 3;
            $noUnit    = trim($row['no_unit'] ?? '');
            $jenisUnit = trim($row['jenis_unit'] ?? '');
            $noLambung = trim($row['no_lambung'] ?? '') ?: null;
            $status    = strtolower(trim($row['status'] ?? 'active'));
            $dept      = trim($row['department'] ?? '') ?: null;

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

            $existing = Unit::where('no_unit', $noUnit)->first();

            // UPDATE — no_unit sudah ada: perbarui data
            if ($existing) {
                try {
                    $existing->update([
                        'jenis_unit' => $jenisUnit,
                        'no_lambung' => $noLambung,
                        'status'     => $status,
                        'department' => $dept,
                    ]);
                    $this->updateCount++;
                } catch (\Throwable $e) {
                    $this->rowErrors[] = "Baris {$rowNum}: " . $e->getMessage();
                }
                continue;
            }

            // CREATE — no_unit baru
            try {
                Unit::create([
                    'no_unit'    => $noUnit,
                    'jenis_unit' => $jenisUnit,
                    'no_lambung' => $noLambung,
                    'status'     => $status,
                    'department' => $dept,
                ]);
                $this->successCount++;
            } catch (\Throwable $e) {
                $this->rowErrors[] = "Baris {$rowNum}: " . $e->getMessage();
            }
        }
    }

    public function successCount(): int { return $this->successCount; }
    public function updateCount(): int  { return $this->updateCount; }
    public function rowErrors(): array  { return $this->rowErrors; }
}
