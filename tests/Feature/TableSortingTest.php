<?php

use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create(['name' => 'Zainal'])->assignRole('admin');
});

test('units are sorted alphabetically by default and by any whitelisted column', function () {
    $utara = Site::create(['name' => 'Utara', 'status' => 'active']);
    $barat = Site::create(['name' => 'Barat', 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-10', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $barat->id]);
    Unit::create(['no_unit' => 'BUS-02', 'jenis_unit' => 'Bus', 'status' => 'active', 'site_id' => $utara->id]);
    Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $utara->id]);

    $this->actingAs($this->admin)->get('/units')
        ->assertInertia(fn (Assert $page) => $page
            ->where('sort', ['by' => 'no_unit', 'dir' => 'asc'])
            ->where('units.data.0.no_unit', 'BUS-02')
            ->where('units.data.1.no_unit', 'LV-02')
            ->where('units.data.2.no_unit', 'LV-10'));

    // Sort lewat relasi (nama site), menurun
    $this->actingAs($this->admin)->get('/units?sort=site&dir=desc')
        ->assertInertia(fn (Assert $page) => $page
            ->where('sort', ['by' => 'site', 'dir' => 'desc'])
            ->where('units.data.2.no_unit', 'LV-10'));
});

test('unknown sort columns fall back to the default instead of reaching the query', function () {
    $this->actingAs($this->admin)->get('/units?sort=id;drop table units&dir=sideways')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('sort', ['by' => 'no_unit', 'dir' => 'asc']));
});

test('users can be sorted by role name', function () {
    User::factory()->create(['name' => 'Andi'])->assignRole('manager');
    User::factory()->create(['name' => 'Budi'])->assignRole('driver');

    $this->actingAs($this->admin)->get('/users')
        ->assertInertia(fn (Assert $page) => $page->where('users.data.0.name', 'Andi'));

    $this->actingAs($this->admin)->get('/users?sort=role&dir=asc')
        ->assertInertia(fn (Assert $page) => $page
            ->where('users.data.0.name', 'Zainal')   // admin
            ->where('users.data.1.name', 'Budi')     // driver
            ->where('users.data.2.name', 'Andi'));   // manager
});

test('every sortable column returns a valid page', function (string $url, array $columns) {
    foreach ($columns as $column) {
        foreach (['asc', 'desc'] as $dir) {
            $this->actingAs($this->admin)->get("{$url}?sort={$column}&dir={$dir}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('sort', ['by' => $column, 'dir' => $dir]));
        }
    }
})->with([
    'units' => ['/units', ['no_unit', 'jenis_unit', 'no_lambung', 'department', 'site', 'status']],
    'units trashed' => ['/units/trashed', ['no_unit', 'jenis_unit', 'no_lambung', 'department', 'deleted_at']],
    'sites' => ['/sites', ['name', 'units_count', 'users_count', 'status']],
    'sites trashed' => ['/sites/trashed', ['name', 'deleted_at']],
    'users' => ['/users', ['name', 'nik', 'role', 'jabatan', 'department', 'site']],
    'downtime' => ['/downtime', ['unit', 'tipe', 'jam_mulai', 'jam_selesai', 'keterangan', 'created_by']],
    'findings' => ['/p2h/findings', ['tanggal_temuan', 'unit', 'item_nama', 'tindakan_perbaikan', 'pic', 'target_selesai', 'status']],
    'audit log' => ['/audit-log', ['created_at', 'log_name', 'description', 'causer']],
    'unit monitoring' => ['/unit-monitoring', ['unit', 'tanggal', 'p2h', 'temuan', 'km', 'bbm']],
]);
