<?php

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['admin', 'manager', 'driver'] as $role) {
        Role::findOrCreate($role);
    }
});

test('monitoring p2h lists today status per unit with an activity feed', function () {
    $manager = User::factory()->create()->assignRole('manager');
    $driver = User::factory()->create(['name' => 'Budi Santoso'])->assignRole('driver');
    $done = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);

    $session = P2hSession::create(['unit_id' => $done->id, 'tanggal' => today(), 'status' => 'completed', 'created_by' => $driver->id]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => now()->subMinutes(20), 'kondisi_akhir' => 'Layak Pakai', 'approval_status' => 'pending',
    ]);

    $this->actingAs($manager)->get(route('monitoring-p2h.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('monitoring-p2h/index')
            ->where('today.summary.submitted', 1)
            ->where('today.summary.belum', 1)
            ->where('today.summary.waiting', 1)
            ->where('feed.0.no_unit', 'LV-01')
            ->where('feed.0.type', 'masuk'));
});

test('regular drivers cannot open monitoring p2h', function () {
    $driver = User::factory()->create()->assignRole('driver');

    $this->actingAs($driver)->get(route('monitoring-p2h.index'))->assertForbidden();
});

test('ingatkan notifies only drivers assigned to units without p2h today', function () {
    $manager = User::factory()->create(['name' => 'Hendra'])->assignRole('manager');
    $assigned = User::factory()->create()->assignRole('driver');
    $other = User::factory()->create()->assignRole('driver');
    $doneDriver = User::factory()->create()->assignRole('driver');

    $belum = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $done = Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $belum->users()->attach($assigned);
    $done->users()->attach($doneDriver);

    $session = P2hSession::create(['unit_id' => $done->id, 'tanggal' => today(), 'status' => 'completed', 'created_by' => $doneDriver->id]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $doneDriver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai', 'approval_status' => 'approved',
    ]);

    $this->actingAs($manager)
        ->post(route('monitoring-p2h.remind'), ['unit_ids' => [$belum->id, $done->id]])
        ->assertRedirect();

    expect($assigned->notifications()->count())->toBe(1)
        ->and($assigned->notifications()->first()->data)->toMatchArray([
            'type' => 'p2h_reminder', 'unit_id' => $belum->id, 'no_unit' => 'LV-01', 'sender' => 'Hendra',
        ])
        ->and($other->notifications()->count())->toBe(0)
        ->and($doneDriver->notifications()->count())->toBe(0);

    // Diingatkan lagi dalam 30 menit → dilewati
    $this->actingAs($manager)->post(route('monitoring-p2h.remind'), ['unit_ids' => [$belum->id]]);
    expect($assigned->notifications()->count())->toBe(1);

    $this->travel(31)->minutes();
    $this->actingAs($manager)->post(route('monitoring-p2h.remind'), ['unit_ids' => [$belum->id]]);
    expect($assigned->notifications()->count())->toBe(2);
});

test('ingatkan notification opens the p2h form', function () {
    $manager = User::factory()->create()->assignRole('manager');
    $driver = User::factory()->create()->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $unit->users()->attach($driver);

    $this->actingAs($manager)->post(route('monitoring-p2h.remind'), ['unit_ids' => [$unit->id]]);
    $id = $driver->notifications()->first()->id;

    $this->actingAs($driver)->patch(route('notifications.read', $id))
        ->assertRedirect(route('p2h.create'));
});

test('regular drivers cannot send reminders', function () {
    $driver = User::factory()->create()->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);

    $this->actingAs($driver)
        ->post(route('monitoring-p2h.remind'), ['unit_ids' => [$unit->id]])
        ->assertForbidden();
});
