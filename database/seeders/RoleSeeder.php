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

        $roleDriver = Role::firstOrCreate(['name' => 'driver']);
        $roleAdmin = Role::firstOrCreate(['name' => 'admin']);
        $roleManager = Role::firstOrCreate(['name' => 'manager']);

        // Driver - User LV 1 (butuh approval untuk P2H LV)
        $driverUser = User::updateOrCreate(
            ['nik' => '1100000000000001'],
            [
                'name' => 'Driver Test',
                'email' => 'driver@pims.test',
                'password' => Hash::make('password'),
                'jabatan' => User::JABATAN_USER_LV1,
                'department' => 'Operasional',
            ]
        );
        $driverUser->syncRoles([$roleDriver]);

        // Driver - User LV 2 (butuh approval, dapat melihat monitoring dept Operasional)
        $staffDriverUser = User::updateOrCreate(
            ['nik' => '1100000000000004'],
            [
                'name' => 'Staff Driver Test',
                'email' => 'staff.driver@pims.test',
                'password' => Hash::make('password'),
                'jabatan' => User::JABATAN_USER_LV2,
                'department' => 'Operasional',
            ]
        );
        $staffDriverUser->syncRoles([$roleDriver]);

        // Admin (akses penuh)
        $adminUser = User::updateOrCreate(
            ['nik' => '1100000000000002'],
            [
                'name' => 'Admin Test',
                'email' => 'admin@pims.test',
                'password' => Hash::make('password'),
                'jabatan' => User::JABATAN_USER_LV1,
            ]
        );
        $adminUser->syncRoles([$roleAdmin]);

        // Manager dengan jabatan Approval
        $managerUser = User::updateOrCreate(
            ['nik' => '1100000000000003'],
            [
                'name' => 'Manager Test',
                'email' => 'manager@pims.test',
                'password' => Hash::make('password'),
                'jabatan' => User::JABATAN_APPROVAL,
                'department' => 'Operasional',
            ]
        );
        $managerUser->syncRoles([$roleManager]);
    }
}
