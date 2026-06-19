<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $roleDriver  = Role::firstOrCreate(['name' => 'driver']);
        $roleAdmin   = Role::firstOrCreate(['name' => 'admin']);
        $roleManager = Role::firstOrCreate(['name' => 'manager']);

        // Driver - Non Staff (butuh approval untuk P2H LV)
        $driverUser = User::updateOrCreate(
            ['nik' => '1100000000000001'],
            [
                'name'       => 'Driver Test',
                'email'      => 'driver@pims.test',
                'password'   => Hash::make('password'),
                'jabatan'    => 'Non Staff',
                'department' => 'Operasional',
            ]
        );
        $driverUser->syncRoles([$roleDriver]);

        // Driver - Staff (dapat approve P2H LV dept Operasional)
        $staffDriverUser = User::updateOrCreate(
            ['nik' => '1100000000000004'],
            [
                'name'       => 'Staff Driver Test',
                'email'      => 'staff.driver@pims.test',
                'password'   => Hash::make('password'),
                'jabatan'    => 'Staff',
                'department' => 'Operasional',
            ]
        );
        $staffDriverUser->syncRoles([$roleDriver]);

        // Admin (tanpa jabatan - akses penuh)
        $adminUser = User::updateOrCreate(
            ['nik' => '1100000000000002'],
            [
                'name'     => 'Admin Test',
                'email'    => 'admin@pims.test',
                'password' => Hash::make('password'),
                'jabatan'  => null,
            ]
        );
        $adminUser->syncRoles([$roleAdmin]);

        // Manager dengan jabatan Sr.Staff
        $managerUser = User::updateOrCreate(
            ['nik' => '1100000000000003'],
            [
                'name'       => 'Manager Test',
                'email'      => 'manager@pims.test',
                'password'   => Hash::make('password'),
                'jabatan'    => 'Sr.Staff',
                'department' => 'Operasional',
            ]
        );
        $managerUser->syncRoles([$roleManager]);
    }
}
