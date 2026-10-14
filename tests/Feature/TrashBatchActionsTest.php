<?php

use App\Models\P2hSession;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('admin');
    $this->manager = User::factory()->create()->assignRole('manager');
});

function trashedUnit(string $noUnit): Unit
{
    $unit = Unit::create(['no_unit' => $noUnit, 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $unit->delete();

    return $unit;
}

test('admins and managers can restore several trashed units at once', function () {
    $a = trashedUnit('LV-01');
    $b = trashedUnit('LV-02');
    $kept = trashedUnit('LV-03');

    $this->actingAs($this->manager)
        ->post(route('units.batch-restore'), ['ids' => [$a->id, $b->id]])
        ->assertRedirect(route('units.trashed'));

    expect(Unit::pluck('no_unit')->sort()->values()->all())->toBe(['LV-01', 'LV-02'])
        ->and(Unit::onlyTrashed()->pluck('id')->all())->toBe([$kept->id]);
});

test('only admins can permanently delete trashed units in batch, including their P2H history', function () {
    $a = trashedUnit('LV-11');
    $b = trashedUnit('LV-12');
    $active = Unit::create(['no_unit' => 'LV-13', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    P2hSession::create(['unit_id' => $a->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $this->admin->id]);

    $this->actingAs($this->manager)
        ->delete(route('units.batch-force-delete'), ['ids' => [$a->id, $b->id]])
        ->assertForbidden();

    // Unit aktif yang ikut terkirim tidak tersentuh: hanya isi sampah yang diproses
    $this->actingAs($this->admin)
        ->delete(route('units.batch-force-delete'), ['ids' => [$a->id, $b->id, $active->id]])
        ->assertRedirect(route('units.trashed'));

    expect(Unit::withTrashed()->pluck('no_unit')->all())->toBe(['LV-13'])
        ->and(P2hSession::withTrashed()->count())->toBe(0);
});

test('batch permanent delete of sites skips sites still used by units or users', function () {
    $free = Site::create(['name' => 'Site Kosong', 'status' => 'active']);
    $used = Site::create(['name' => 'Site Dipakai', 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-21', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $used->id]);
    $free->delete();
    $used->delete();

    $this->actingAs($this->admin)
        ->delete(route('sites.batch-force-delete'), ['ids' => [$free->id, $used->id]])
        ->assertRedirect(route('sites.trashed'));

    expect(Site::withTrashed()->pluck('name')->all())->toBe(['Site Dipakai']);

    $this->actingAs($this->manager)
        ->post(route('sites.batch-restore'), ['ids' => [$used->id]]);

    expect(Site::find($used->id))->not->toBeNull();
});

test('batch actions require at least one id', function () {
    $this->actingAs($this->admin)
        ->post(route('units.batch-restore'), ['ids' => []])
        ->assertSessionHasErrors('ids');
});
