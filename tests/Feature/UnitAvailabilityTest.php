<?php

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use App\Notifications\MissingP2hReminder;
use App\Support\FleetAvailability;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->travelTo(Carbon::parse('2026-10-10 20:00'));
    $this->driver = User::factory()->create();
});

function availabilityEntry(Unit $unit, string $submittedAt, string $kondisi, string $shift = 'Shift I', ?string $approval = null): P2hUserEntry
{
    $at = Carbon::parse($submittedAt);
    $session = P2hSession::where('unit_id', $unit->id)->whereDate('tanggal', $at)->first()
        ?? P2hSession::create(['unit_id' => $unit->id, 'tanggal' => $at->toDateString(), 'status' => 'open', 'created_by' => test()->driver->id]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => test()->driver->id, 'user_slot' => $shift === 'Shift I' ? 1 : 2,
        'shift' => $shift, 'submitted_at' => $at, 'kondisi_akhir' => $kondisi, 'approval_status' => $approval,
    ]);
}

test('a BD P2H opens a breakdown and the next Layak P2H closes it', function () {
    $unit = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);

    $bd = availabilityEntry($unit, '2026-10-08 07:00', 'BD');
    $log = UnitDowntimeLog::sole();
    expect($log->tipe)->toBe('BD')
        ->and($log->jam_mulai->toDateTimeString())->toBe('2026-10-08 07:00:00')
        ->and($log->jam_selesai)->toBeNull()
        ->and($log->opened_by_entry_id)->toBe($bd->id);

    // BD lagi saat masih breakdown tidak membuka log baru
    availabilityEntry($unit, '2026-10-08 19:00', 'BD', 'Shift II');
    expect(UnitDowntimeLog::count())->toBe(1);

    $layak = availabilityEntry($unit, '2026-10-09 07:00', 'Layak Pakai');
    expect($log->fresh()->jam_selesai->toDateTimeString())->toBe('2026-10-09 07:00:00')
        ->and($log->fresh()->closed_by_entry_id)->toBe($layak->id);

    // Entry penutup dihapus → breakdown kembali berjalan
    $layak->delete();
    expect($log->fresh()->jam_selesai)->toBeNull();
});

test('LV P2H waiting for approval only affects unit status once approved, and rejection reverts it', function () {
    $unit = Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);

    $entry = availabilityEntry($unit, '2026-10-10 07:00', 'BD', approval: 'pending');
    expect(UnitDowntimeLog::count())->toBe(0);

    $entry->update(['approval_status' => 'approved']);
    expect(UnitDowntimeLog::count())->toBe(1);

    $entry->update(['approval_status' => 'rejected']);
    expect(UnitDowntimeLog::count())->toBe(0);
});

function availabilityUnit(string $noUnit, string $jenis = 'Light Vehicle'): Unit
{
    $unit = Unit::create(['no_unit' => $noUnit, 'jenis_unit' => $jenis, 'status' => 'active']);
    $unit->forceFill(['created_at' => '2026-01-01 00:00:00'])->saveQuietly();

    return $unit;
}

test('PA uses calendar hours for every active unit, minus downtime up to now', function () {
    $lv = availabilityUnit('LV-03');
    $idle = availabilityUnit('LV-04');          // tidak P2H & tidak downtime → tetap dihitung tersedia
    $bus = availabilityUnit('BUS-01', 'Bus');

    availabilityEntry($lv, '2026-10-09 07:00', 'Layak Pakai');
    availabilityEntry($lv, '2026-10-10 08:00', 'BD');   // BD berjalan 12 jam s/d 20:00
    availabilityEntry($bus, '2026-10-10 07:00', 'Layak Pakai');

    // Periode 9 Okt 00:00 – 10 Okt 20:00 (sekarang) = 44 jam per unit
    $result = FleetAvailability::build(Carbon::parse('2026-10-09'), Carbon::parse('2026-10-10'));
    $units = $result['units']->keyBy('no_unit');

    expect($units['LV-03'])
        ->calendar_hours->toBe(44.0)
        ->downtime_hours->toBe(12.0)
        ->actual_pa->toBe(72.7)
        ->current_status->toBe('bd')
        ->downtime_tipe->toBe('BD')
        ->and($units['LV-04']['actual_pa'])->toBe(100.0)
        ->and($units['BUS-01']['current_status'])->toBe('operation')
        // LV: (32 + 44) / 88
        ->and($result['summary']['pa_by_jenis']['Light Vehicle'])->toMatchArray(['pa' => 86.4, 'total' => 2, 'bd' => 1])
        ->and($result['summary']['fleet_actual_pa'])->toBe(90.9);

    // Laporan tanggal kemarin membaca status pada akhir hari itu, bukan status sekarang
    $kemarin = FleetAvailability::build(Carbon::parse('2026-10-09'), Carbon::parse('2026-10-09'));
    expect($kemarin['units']->firstWhere('no_unit', 'LV-03')['current_status'])->toBe('operation')
        ->and($kemarin['summary']['pa_by_jenis']['Light Vehicle']['pa'])->toBe(100.0);
});

test('admin sets the unit status and P2H updates it only when it happens later', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $unit = availabilityUnit('LV-20');
    $status = fn () => UnitDowntimeLog::where('unit_id', $unit->id)->whereNull('jam_selesai')->value('tipe') ?? 'Ready';

    // Admin: unit masuk PM pagi ini
    $this->actingAs($admin)->patch(route('units.status', $unit), ['status' => 'PM', 'waktu' => '2026-10-09 06:00'])
        ->assertSessionHasNoErrors();
    expect($status())->toBe('PM');

    // P2H BD saat unit masih PM tidak mengubah status
    availabilityEntry($unit, '2026-10-09 07:00', 'BD');
    expect($status())->toBe('PM');

    // P2H Layak Pakai setelahnya → unit kembali Ready
    availabilityEntry($unit, '2026-10-09 19:00', 'Layak Pakai', 'Shift II');
    expect($status())->toBe('Ready');

    // Admin menyatakan BD setelah P2H → status admin yang berlaku
    $this->actingAs($admin)->patch(route('units.status', $unit), ['status' => 'BD', 'waktu' => '2026-10-10 06:00']);
    expect($status())->toBe('BD');

    // P2H Layak yang tercatat lebih awal (mis. baru di-approve) tidak menimpa keputusan admin
    availabilityEntry($unit, '2026-10-10 05:00', 'Layak Pakai');
    expect($status())->toBe('BD');

    // Waktu sebelum status berjalan dimulai ditolak
    $this->actingAs($admin)->patch(route('units.status', $unit), ['status' => 'Ready', 'waktu' => '2026-10-10 05:30'])
        ->assertSessionHasErrors('waktu');
});

test('drivers cannot change unit status', function () {
    $driver = User::factory()->create()->assignRole('driver');
    $unit = availabilityUnit('LV-21');

    $this->actingAs($driver)->patch(route('units.status', $unit), ['status' => 'BD'])->assertForbidden();
});

test('admins and managers are reminded about active units without P2H today', function () {
    Notification::fake();
    $admin = User::factory()->create()->assignRole('admin');
    $manager = User::factory()->create()->assignRole('manager');
    $done = Unit::create(['no_unit' => 'LV-10', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-11', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-12', 'jenis_unit' => 'Light Vehicle', 'status' => 'inactive']);
    availabilityEntry($done, '2026-10-10 07:00', 'Layak Pakai');

    $this->artisan('p2h:remind-missing')->assertSuccessful();

    Notification::assertSentTo([$admin, $manager], MissingP2hReminder::class,
        fn (MissingP2hReminder $n) => $n->toArray($admin)['no_unit'] === 'LV-11' && $n->toArray($admin)['jumlah'] === 1);
    Notification::assertNotSentTo($this->driver, MissingP2hReminder::class);
});
