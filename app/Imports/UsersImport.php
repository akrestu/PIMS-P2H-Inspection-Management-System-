<?php

namespace App\Imports;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithStartRow;

class UsersImport implements ToCollection, WithHeadingRow
{
    private int $successCount = 0;
    private array $rowErrors = [];

    public function headingRow(): int
    {
        return 2;
    }

    public function collection(Collection $rows): void
    {
        set_time_limit(0);

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // +2: baris 1 = heading

            $name     = trim($row['nama_lengkap'] ?? $row['nama'] ?? '');
            $nik      = trim($row['nik'] ?? '');
            $email    = trim($row['email'] ?? '') ?: null;
            $password = trim($row['password'] ?? '');
            $role     = strtolower(trim($row['role'] ?? ''));
            $nama     = trim($row['nama_driver'] ?? '');
            $dept     = trim($row['department'] ?? '');
            $jenisUnit = trim($row['jenis_unit'] ?? '') ?: null;

            // Validasi manual per baris
            if (empty($name)) {
                $this->rowErrors[] = "Baris {$rowNum}: Nama lengkap wajib diisi.";
                continue;
            }
            if (empty($nik)) {
                $this->rowErrors[] = "Baris {$rowNum}: NIK wajib diisi.";
                continue;
            }
            if (empty($password)) {
                $this->rowErrors[] = "Baris {$rowNum}: Password wajib diisi.";
                continue;
            }
            if (strlen($password) < 8) {
                $this->rowErrors[] = "Baris {$rowNum}: Password minimal 8 karakter.";
                continue;
            }
            if (!in_array($role, ['admin', 'manager', 'driver'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Role '{$role}' tidak valid (admin/manager/driver).";
                continue;
            }
            if (User::where('nik', $nik)->exists()) {
                $this->rowErrors[] = "Baris {$rowNum}: NIK '{$nik}' sudah terdaftar.";
                continue;
            }
            if ($email && User::where('email', $email)->exists()) {
                $this->rowErrors[] = "Baris {$rowNum}: Email '{$email}' sudah terdaftar.";
                continue;
            }
            if ($role === 'driver' && empty($nama)) {
                $this->rowErrors[] = "Baris {$rowNum}: Nama driver wajib diisi untuk role driver.";
                continue;
            }
            if ($role === 'driver' && empty($dept)) {
                $this->rowErrors[] = "Baris {$rowNum}: Department wajib diisi untuk role driver.";
                continue;
            }
            if ($jenisUnit && !in_array($jenisUnit, ['Bus', 'Light Vehicle'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jenis unit '{$jenisUnit}' tidak valid (Bus / Light Vehicle).";
                continue;
            }

            try {
                DB::transaction(function () use ($name, $nik, $email, $password, $role, $nama, $dept, $jenisUnit) {
                    $user = User::create([
                        'name'     => $name,
                        'nik'      => $nik,
                        'email'    => $email,
                        'password' => Hash::make($password),
                    ]);
                    $user->assignRole($role);

                    if ($role === 'driver') {
                        Driver::create([
                            'user_id'    => $user->id,
                            'nik'        => $nik,
                            'nama'       => $nama,
                            'department' => $dept,
                            'jenis_unit' => $jenisUnit,
                        ]);
                    }
                });

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
