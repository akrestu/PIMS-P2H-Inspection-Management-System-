<?php

use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('driver');
});

test('submitting p2h opens the submitted screen with result and findings', function () {
    $user = User::factory()->create(['jenis_unit' => 'Bus'])->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-03', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $user->units()->attach($unit);
    $rem = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);
    $lampu = P2hInspectionItem::create(['nama_item' => 'Lampu', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 2, 'is_active' => true]);

    $response = $this->actingAs($user)->post(route('p2h.store'), [
        'unit_id' => $unit->id,
        'shift' => 'Shift I',
        'paraf' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=',
        'kondisi_akhir' => 'BD',
        'answers' => [
            ['inspection_item_id' => $rem->id, 'kondisi' => 'Tidak Layak', 'keterangan' => 'Rem blong'],
            ['inspection_item_id' => $lampu->id, 'kondisi' => 'Layak'],
        ],
    ]);

    $entry = P2hUserEntry::firstOrFail();
    $response->assertRedirect(route('p2h.submitted', $entry));

    $this->actingAs($user)->get(route('p2h.submitted', $entry))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('p2h/submitted')
            ->where('unit', 'BUS-03')
            ->where('layak', false)
            ->where('critical', true)
            ->where('findings', ['Rem']));
});

test('drivers cannot open another drivers submitted screen', function () {
    $owner = User::factory()->create(['jenis_unit' => 'Bus'])->assignRole('driver');
    $other = User::factory()->create(['jenis_unit' => 'Bus'])->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-04', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $owner->id]);
    $entry = P2hUserEntry::create(['p2h_session_id' => $session->id, 'user_id' => $owner->id, 'user_slot' => 1, 'shift' => 'Shift I', 'kondisi_akhir' => 'Layak Pakai']);

    $this->actingAs($other)->get(route('p2h.submitted', $entry))->assertForbidden();
});
