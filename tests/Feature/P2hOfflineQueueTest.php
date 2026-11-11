<?php

use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('driver');
    $this->driver = User::factory()->create(['jenis_unit' => 'Bus'])->assignRole('driver');
    $this->unit = Unit::create(['no_unit' => 'BUS-09', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $this->driver->units()->attach($this->unit);
    $this->item = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);
});

function offlinePayload(array $overrides = []): array
{
    return array_merge([
        'unit_id' => test()->unit->id,
        'shift' => 'Shift I',
        'paraf' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=',
        'kondisi_akhir' => 'Layak Pakai',
        'answers' => [['inspection_item_id' => test()->item->id, 'kondisi' => 'Layak']],
    ], $overrides);
}

test('the same client_uuid does not create a duplicate entry', function () {
    $uuid = (string) Str::uuid();

    $first = $this->actingAs($this->driver)->post(route('p2h.store'), offlinePayload(['client_uuid' => $uuid, 'offline' => true]));
    $second = $this->actingAs($this->driver)->post(route('p2h.store'), offlinePayload(['client_uuid' => $uuid, 'offline' => true]));

    $entry = P2hUserEntry::sole();
    $first->assertRedirect(route('p2h.submitted', $entry));
    $second->assertRedirect(route('p2h.submitted', $entry));
    expect($entry->client_uuid)->toBe($uuid)
        ->and($entry->submitted_offline)->toBeTrue();
});

test('a queued p2h is dated by its fill time, not the sync time', function () {
    $this->travelTo(now()->setTime(7, 0));
    $filledAt = now()->subDay()->setTime(6, 15);

    $this->actingAs($this->driver)->post(route('p2h.store'), offlinePayload([
        'client_uuid' => (string) Str::uuid(),
        'filled_at' => $filledAt->toIso8601String(),
    ]))->assertRedirect();

    $entry = P2hUserEntry::sole();
    expect(P2hSession::sole()->tanggal->toDateString())->toBe($filledAt->toDateString())
        ->and($entry->submitted_at->format('Y-m-d H:i'))->toBe($filledAt->format('Y-m-d H:i'));
});

test('fill times older than three days or in the future are rejected', function (string $when) {
    $this->actingAs($this->driver)->post(route('p2h.store'), offlinePayload([
        'filled_at' => $when === 'old' ? now()->subDays(4)->toIso8601String() : now()->addHour()->toIso8601String(),
    ]))->assertSessionHasErrors('filled_at');

    expect(P2hUserEntry::count())->toBe(0);
})->with(['old', 'future']);

test('another driver cannot claim an entry by reusing its client_uuid', function () {
    $uuid = (string) Str::uuid();
    $this->actingAs($this->driver)->post(route('p2h.store'), offlinePayload(['client_uuid' => $uuid]));

    $other = User::factory()->create(['jenis_unit' => 'Bus'])->assignRole('driver');
    $other->units()->attach($this->unit);

    $this->actingAs($other)->post(route('p2h.store'), offlinePayload(['client_uuid' => $uuid]))
        ->assertSessionHasErrors('client_uuid');

    expect(P2hUserEntry::count())->toBe(1);
});
