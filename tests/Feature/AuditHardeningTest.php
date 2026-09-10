<?php

use App\Imports\UsersImport;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['admin', 'manager', 'driver'] as $role) {
        Role::findOrCreate($role);
    }
});

test('authenticated user without a role cannot access p2h routes', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'ROLELESS-1', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $user->id,
    ]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id,
        'user_id' => $user->id,
        'user_slot' => 1,
        'shift' => 'Shift I',
        'pic_approver_id' => $user->id,
        'approval_status' => 'pending',
    ]);

    $this->actingAs($user)
        ->get(route('p2h.index'))
        ->assertForbidden();
    $this->get(route('p2h.approvals'))->assertForbidden();
    $this->get(route('p2h.show', $session))->assertForbidden();
    $this->get(route('p2h.export-pdf', $session))->assertForbidden();
    $this->get(route('p2h.entry.detail', $entry))->assertForbidden();
});

test('manager cannot create an admin through user import', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');

    $import = new UsersImport($manager);
    $import->collection(collect([
        collect([
            'nama_lengkap' => 'Imported Admin',
            'nik' => 'ADM-IMPORT',
            'email' => 'imported-admin@example.test',
            'password' => 'Password123!',
            'role' => 'admin',
            'jabatan' => '',
            'department' => '',
            'jenis_unit' => '',
            'site' => '',
        ]),
    ]));

    expect(User::where('nik', 'ADM-IMPORT')->exists())->toBeFalse()
        ->and($import->rowErrors())->not->toBeEmpty();
});

test('only approved or approval-free entries are operational', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-AUDIT', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $user->id,
    ]);

    foreach ([null, 'pending', 'approved', 'rejected'] as $slot => $status) {
        P2hUserEntry::create([
            'p2h_session_id' => $session->id,
            'user_id' => $user->id,
            'user_slot' => $slot + 1,
            'shift' => 'Shift I',
            'approval_status' => $status,
        ]);
    }

    expect(P2hUserEntry::operational()->count())->toBe(2);
});

test('pending entries are excluded from dashboard operational metrics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-PENDING', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $driver->id,
    ]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id,
        'user_id' => $driver->id,
        'user_slot' => 1,
        'shift' => 'Shift I',
        'approval_status' => 'pending',
        'kondisi_akhir' => 'Layak Pakai',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('metrics.total_p2h_hari_ini', 0)
            ->has('recentP2h', 0));
});

test('downtime duration is clipped to the requested reporting period', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'BUS-DT', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $log = UnitDowntimeLog::create([
        'unit_id' => $unit->id,
        'tipe' => 'BD',
        'jam_mulai' => '2026-08-31 12:00:00',
        'jam_selesai' => '2026-09-02 12:00:00',
        'created_by' => $user->id,
    ]);

    expect($log->durationHoursWithin('2026-09-01', '2026-09-01'))->toBe(24.0);
});

test('app settings reject shifts unsupported by the database', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('app-settings.update'), ['shifts' => ['Shift III']])
        ->assertSessionHasErrors('shifts.0');
});

test('account with operational history is not logged out when self deletion is rejected', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'BUS-PROFILE', 'jenis_unit' => 'Bus', 'status' => 'active']);
    P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasErrors('password');

    $this->assertAuthenticatedAs($user);
    expect($user->fresh())->not->toBeNull();
});
