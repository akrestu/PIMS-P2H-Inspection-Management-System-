<?php

namespace App\Imports;

use App\Models\Site;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UsersImport implements ToCollection, WithHeadingRow
{
    private int $successCount = 0;

    private int $updateCount = 0;

    private array $rowErrors = [];

    public function __construct(private readonly User $actor) {}

    public function headingRow(): int
    {
        return 2;
    }

    public function collection(Collection $rows): void
    {
        set_time_limit(0);

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;
            $name = trim($row['nama_lengkap'] ?? $row['nama'] ?? '');
            $nik = trim($row['nik'] ?? '');
            $email = trim($row['email'] ?? '') ?: null;
            $password = trim($row['password'] ?? '');
            $role = strtolower(trim($row['role'] ?? ''));
            $jabatan = trim($row['jabatan'] ?? '');
            $dept = trim($row['department'] ?? '');
            $jenisUnit = trim($row['jenis_unit'] ?? '') ?: null;
            $siteName = trim($row['site'] ?? '') ?: null;

            if (empty($name)) {
                $this->rowErrors[] = "Baris {$rowNum}: Nama lengkap wajib diisi.";

                continue;
            }
            if (empty($nik)) {
                $this->rowErrors[] = "Baris {$rowNum}: NIK wajib diisi.";

                continue;
            }
            if (mb_strlen($name) > 255 || mb_strlen($nik) > 20 || mb_strlen($dept) > 255 || ($email && mb_strlen($email) > 255)) {
                $this->rowErrors[] = "Baris {$rowNum}: Panjang nama, NIK, email, atau department melebihi batas.";

                continue;
            }
            if ($email && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->rowErrors[] = "Baris {$rowNum}: Format email tidak valid.";

                continue;
            }
            if (! in_array($role, ['admin', 'manager', 'driver'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Role '{$role}' tidak valid (admin/manager/driver).";

                continue;
            }
            if ($role !== 'admin' && ! in_array($jabatan, ['Sr.Staff', 'Staff', 'Non Staff'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jabatan '{$jabatan}' tidak valid (Sr.Staff/Staff/Non Staff).";

                continue;
            }
            if ($role !== 'admin' && empty($dept)) {
                $this->rowErrors[] = "Baris {$rowNum}: Department wajib diisi untuk role {$role}.";

                continue;
            }
            if ($jenisUnit && ! in_array($jenisUnit, ['Bus', 'Light Vehicle'])) {
                $this->rowErrors[] = "Baris {$rowNum}: Jenis unit '{$jenisUnit}' tidak valid (Bus / Light Vehicle).";

                continue;
            }

            $siteId = null;
            if ($siteName) {
                $site = Site::active()->where('name', $siteName)->first();
                if (! $site) {
                    $this->rowErrors[] = "Baris {$rowNum}: Site '{$siteName}' tidak ditemukan.";

                    continue;
                }
                $siteId = $site->id;
            }

            $existingUser = User::where('nik', $nik)->first();

            if (! $this->actor->hasRole('admin') && $role === 'admin') {
                $this->rowErrors[] = "Baris {$rowNum}: Manager tidak diizinkan membuat atau mempromosikan akun admin.";

                continue;
            }

            if ($existingUser && ! $this->actor->hasRole('admin') && $existingUser->hasRole('admin')) {
                $this->rowErrors[] = "Baris {$rowNum}: Manager tidak diizinkan mengubah akun admin.";

                continue;
            }

            if ($existingUser?->is($this->actor) && $role !== $existingUser->getRoleNames()->first()) {
                $this->rowErrors[] = "Baris {$rowNum}: Role akun sendiri tidak dapat diubah melalui import.";

                continue;
            }

            // UPDATE — NIK sudah ada: perbarui data kecuali password
            if ($existingUser) {
                // Validasi email unik: boleh sama dengan milik user sendiri
                if ($email && User::where('email', $email)->where('id', '!=', $existingUser->id)->exists()) {
                    $this->rowErrors[] = "Baris {$rowNum}: Email '{$email}' sudah digunakan user lain.";

                    continue;
                }

                try {
                    DB::transaction(function () use ($existingUser, $name, $email, $role, $jabatan, $dept, $jenisUnit, $siteId) {
                        $existingUser->update([
                            'name' => $name,
                            'email' => $email,
                            'jabatan' => $role !== 'admin' ? $jabatan : null,
                            'department' => $role !== 'admin' ? $dept : null,
                            'jenis_unit' => $jenisUnit,
                            'site_id' => $siteId,
                        ]);
                        // Sync role jika berubah
                        $existingUser->syncRoles([$role]);
                    });

                    $this->updateCount++;
                } catch (\Throwable $e) {
                    Log::warning('Import user gagal.', ['row' => $rowNum, 'error' => $e->getMessage()]);
                    $this->rowErrors[] = "Baris {$rowNum}: Data gagal disimpan.";
                }

                continue;
            }

            // CREATE — NIK baru: password wajib
            if (empty($password)) {
                $this->rowErrors[] = "Baris {$rowNum}: Password wajib diisi untuk user baru.";

                continue;
            }
            if (strlen($password) < 8) {
                $this->rowErrors[] = "Baris {$rowNum}: Password minimal 8 karakter.";

                continue;
            }
            if ($email && User::where('email', $email)->exists()) {
                $this->rowErrors[] = "Baris {$rowNum}: Email '{$email}' sudah terdaftar.";

                continue;
            }

            try {
                DB::transaction(function () use ($name, $nik, $email, $password, $role, $jabatan, $dept, $jenisUnit, $siteId) {
                    $user = User::create([
                        'name' => $name,
                        'nik' => $nik,
                        'email' => $email,
                        'password' => Hash::make($password),
                        'jabatan' => $role !== 'admin' ? $jabatan : null,
                        'department' => $role !== 'admin' ? $dept : null,
                        'jenis_unit' => $jenisUnit,
                        'site_id' => $siteId,
                    ]);
                    $user->assignRole($role);
                });

                $this->successCount++;
            } catch (\Throwable $e) {
                Log::warning('Import user gagal.', ['row' => $rowNum, 'error' => $e->getMessage()]);
                $this->rowErrors[] = "Baris {$rowNum}: Data gagal disimpan.";
            }
        }
    }

    public function successCount(): int
    {
        return $this->successCount;
    }

    public function updateCount(): int
    {
        return $this->updateCount;
    }

    public function rowErrors(): array
    {
        return $this->rowErrors;
    }
}
