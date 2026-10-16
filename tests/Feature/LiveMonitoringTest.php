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
