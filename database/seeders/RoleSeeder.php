<?php

namespace Database\Seeders;

use App\Models\Driver;
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

        $roleDriver  = Role::create(['name' => 'driver']);
        $roleAdmin   = Role::create(['name' => 'admin']);
        $roleManager = Role::create(['name' => 'manager']);

        // Default driver user
        $driverUser = User::create([
            'name'     => 'Driver Test',
            'nik'      => '1100000000000001',
            'email'    => 'driver@pims.test',
            'password' => Hash::make('password'),
        ]);
        $driverUser->assignRole($roleDriver);
        Driver::create([
            'user_id'    => $driverUser->id,
            'nik'        => 'NIK-001',
            'nama'       => 'Driver Test',
            'department' => 'Operasional',
        ]);

        // Default admin user
        $adminUser = User::create([
            'name'     => 'Admin Test',
            'nik'      => '1100000000000002',
            'email'    => 'admin@pims.test',
            'password' => Hash::make('password'),
        ]);
        $adminUser->assignRole($roleAdmin);

        // Default manager user
        $managerUser = User::create([
            'name'     => 'Manager Test',
            'nik'      => '1100000000000003',
            'email'    => 'manager@pims.test',
            'password' => Hash::make('password'),
        ]);
        $managerUser->assignRole($roleManager);
    }
}
