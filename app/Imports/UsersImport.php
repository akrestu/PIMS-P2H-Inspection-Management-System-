<?php

namespace App\Imports;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

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
            $rowNum    = $index + 2;
            $name      = trim($row['nama_lengkap'] ?? $row['nama'] ?? '');
            $nik       = trim($row['nik'] ?? '');
            $email     = trim($row['email'] ?? '') ?: null;
            $password  = trim($row['password'] ?? '');
            $role      = strtolower(trim($row['role'] ?? ''));
            $jabatan   = trim($row['jabatan'] ?? '');
            $dept      = trim($row['department'] ?? '');
            $jenisUnit = trim($row['jenis_unit'] ?? '') ?: null;

            if (empty($name)) { $this->rowErrors[] = "Baris {$rowNum}: Nama lengkap wajib diisi."; continue; }
            if (empty($nik))  { $this->rowErrors[] = "Baris {$rowNum}: NIK wajib diisi."; continue; }
            if (empty($password)) { $this->rowErrors[] = "Baris {$rowNum}: Password wajib diisi."; continue; }
            if (strlen($password) < 8) { $this->rowErrors[] = "Baris {$rowNum}: Password minimal 8 karakter."; continue; }
            if (!in_array($role, ['admin', 'manager', 'driver'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Role '{$role}' tidak valid (admin/manager/driver).";
                continue;
            }
            if ($role !== 'admin' && !in_array($jabatan, ['Sr.Staff', 'Staff', 'Non Staff'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jabatan '{$jabatan}' tidak valid (Sr.Staff/Staff/Non Staff).";
                continue;
            }
            if ($role !== 'admin' && empty($dept)) {
                $this->rowErrors[] = "Baris {$rowNum}: Department wajib diisi untuk role {$role}.";
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
            if ($jenisUnit && !in_array($jenisUnit, ['Bus', 'Light Vehicle'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jenis unit '{$jenisUnit}' tidak valid (Bus / Light Vehicle).";
                continue;
            }

            try {
                DB::transaction(function () use ($name, $nik, $email, $password, $role, $jabatan, $dept, $jenisUnit) {
                    $user = User::create([
                        'name'       => $name,
                        'nik'        => $nik,
                        'email'      => $email,
                        'password'   => Hash::make($password),
                        'jabatan'    => $role !== 'admin' ? $jabatan : null,
                        'department' => $role !== 'admin' ? $dept : null,
                        'jenis_unit' => $jenisUnit,
                    ]);
                    $user->assignRole($role);
                });

                $this->successCount++;
            } catch (\Throwable $e) {
                $this->rowErrors[] = "Baris {$rowNum}: " . $e->getMessage();
            }
        }
    }

    public function successCount(): int { return $this->successCount; }
    public function rowErrors(): array  { return $this->rowErrors; }
}
