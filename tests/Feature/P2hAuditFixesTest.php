<?php

use App\Enums\FindingStatus;
use App\Models\AppSetting;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeriodP2hReport;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
});

function auditAdmin(): User
{
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    return $admin;
}

function auditEntry(User $driver, Unit $unit): P2hUserEntry
{
    $session = P2hSession::create([
        'unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $driver->id,
    ]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
    ]);
}

test('deleting a session also deletes its entries so a restore cannot resurrect them', function () {
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'BUS-9', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $entry = auditEntry($driver, $unit);
    $session = $entry->session;

    $this->actingAs(auditAdmin())
        ->delete(route('p2h.destroy', $session))
        ->assertRedirect(route('p2h.index'));

    expect($entry->fresh()->trashed())->toBeTrue();

    $session->restore();

    expect($session->fresh()->userEntries()->count())->toBe(0);
});

test('staff monitoring is limited to lv units of their department regardless of jenis_unit', function () {
    $site = Site::create(['name' => 'Site A', 'status' => 'active']);
    $staff = User::factory()->create([
        'jabatan' => User::JABATAN_USER_LV2, 'department' => 'Operasional', 'jenis_unit' => null, 'site_id' => null,
    ]);
    $staff->assignRole('driver');

    Unit::create(['no_unit' => 'LV-OPS', 'jenis_unit' => 'Light Vehicle', 'department' => 'Operasional', 'site_id' => $site->id, 'status' => 'active']);
    Unit::create(['no_unit' => 'LV-HR', 'jenis_unit' => 'Light Vehicle', 'department' => 'HR', 'status' => 'active']);
    Unit::create(['no_unit' => 'BUS-OPS', 'jenis_unit' => 'Bus', 'department' => 'Operasional', 'status' => 'active']);

    // Compliance: tidak lagi bocor ke departemen lain / jenis lain
    $this->actingAs($staff)
        ->get(route('p2h.compliance'))
        ->assertInertia(fn ($page) => $page
            ->has('matrix', 1)
            ->where('matrix.0.no_unit', 'LV-OPS'));

    // Monitoring PA: user tanpa site tetap melihat unit departemennya yang punya site
    $this->actingAs($staff)
        ->get(route('monitoring.index'))
        ->assertInertia(fn ($page) => $page
            ->has('allUnits', 1)
            ->where('allUnits.0.no_unit', 'LV-OPS'));
});

test('a failed user deletion does not leave a deletion audit log', function () {
    $admin = auditAdmin();
    $driver = User::factory()->create();
    $driver->assignRole('driver');
    auditEntry($driver, Unit::create(['no_unit' => 'BUS-7', 'jenis_unit' => 'Bus', 'status' => 'active']));

    $this->actingAs($admin)->delete(route('users.destroy', $driver));
    $this->actingAs($admin)->delete(route('users.batch-destroy'), ['ids' => [$driver->id]]);

    expect(User::whereKey($driver->id)->exists())->toBeTrue()
        ->and(Activity::where('description', 'like', 'Menghapus user%')->count())->toBe(0);

    $removable = User::factory()->create();
    $removable->assignRole('driver');
    $this->actingAs($admin)->delete(route('users.destroy', $removable));

    expect(Activity::where('description', "Menghapus user: {$removable->name} (driver)")->count())->toBe(1);
});

test('re-closing a reopened finding requires a new photo', function () {
    $driver = User::factory()->create();
    $entry = auditEntry($driver, Unit::create(['no_unit' => 'LV-5', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']));
    $item = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 1, 'is_active' => true]);
    P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
        'keterangan' => 'Aus', 'item_nama' => 'Rem', 'item_section' => 'A', 'item_kode_bahaya' => 'A', 'item_urutan' => 1,
    ]);
    $finding = P2hFinding::firstOrFail();
    $finding->forceFill(['status' => FindingStatus::Closed, 'foto_penutupan' => 'p2h-findings/old.jpg'])->save();
    $admin = auditAdmin();

    // Edit catatan pada temuan yang masih closed tidak butuh foto baru
    $this->actingAs($admin)
        ->patch(route('p2h.findings.update', $finding), ['status' => 'closed', 'catatan_penutupan' => 'OK'])
        ->assertSessionHasNoErrors();

    $this->actingAs($admin)
        ->patch(route('p2h.findings.update', $finding), ['status' => 'open'])
        ->assertSessionHasNoErrors();

    $this->actingAs($admin)
        ->patch(route('p2h.findings.update', $finding->fresh()), ['status' => 'closed'])
        ->assertSessionHasErrors('foto_penutupan');
});

function auditTlAnswer(P2hUserEntry $entry, P2hInspectionItem $item): P2hChecklistAnswer
{
    return P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
        'keterangan' => 'Aus', 'item_nama' => $item->nama_item, 'item_section' => 'A',
        'item_kode_bahaya' => $item->kode_bahaya, 'item_urutan' => 1,
    ]);
}

function auditSessionEntry(User $driver, Unit $unit, $tanggal, ?string $approval = null): P2hUserEntry
{
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => $tanggal, 'status' => 'open', 'created_by' => $driver->id]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1,
        'shift' => 'Shift I', 'approval_status' => $approval, 'submitted_at' => now(),
    ]);
}

test('a merged finding stays active when its first report is rejected', function () {
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-M1', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $item = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 1, 'is_active' => true]);

    $first = auditSessionEntry($driver, $unit, today()->subDay(), 'pending');
    auditTlAnswer($first, $item);
    $second = auditSessionEntry($driver, $unit, today());
    auditTlAnswer($second, $item);

    expect(P2hFinding::count())->toBe(1);

    $first->update(['approval_status' => 'rejected']);
    expect(P2hFinding::unresolved()->count())->toBe(1);

    $second->delete();
    expect(P2hFinding::unresolved()->count())->toBe(0);
});

test('driver dashboard recognises a shift II p2h after midnight', function () {
    $driver = User::factory()->create();
    $driver->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-N', 'jenis_unit' => 'Bus', 'status' => 'active']);

    $this->travelTo(Carbon\Carbon::parse('2026-09-25 19:00'));
    auditSessionEntry($driver, $unit, today())->update(['shift' => 'Shift II']);

    $this->travelTo(Carbon\Carbon::parse('2026-09-26 01:00'));
    $this->actingAs($driver)
        ->get(route('driver.dashboard'))
        ->assertInertia(fn ($page) => $page->where('shiftAktif', 'Shift II')->where('sudahP2hShiftIni', true));

    // Shift II berikutnya (malam 26) belum diisi
    $this->travelTo(Carbon\Carbon::parse('2026-09-26 19:00'));
    $this->actingAs($driver)
        ->get(route('driver.dashboard'))
        ->assertInertia(fn ($page) => $page->where('sudahP2hShiftIni', false));
});

test('period report does not count sessions with only rejected entries', function () {
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-R', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    auditSessionEntry($driver, $unit, today(), 'rejected');

    $report = PeriodP2hReport::build(today(), today());

    expect($report['kepatuhan']['p2h_masuk'])->toBe(0);
});

test('dashboard critical count uses the snapshot hazard code', function () {
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-C', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $item = P2hInspectionItem::create(['nama_item' => 'APAR', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);
    auditTlAnswer(auditSessionEntry($driver, $unit, today()), $item);

    // Master item diturunkan setelah P2H diisi — data historis tetap critical
    $item->update(['kode_bahaya' => 'A']);

    $this->actingAs(auditAdmin())
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('metrics.critical_tidak_layak', 1));
});

test('period and analytics reports reject ranges longer than a year', function () {
    $admin = auditAdmin();

    $this->actingAs($admin)
        ->get(route('p2h.period-report', ['period' => 'custom', 'start' => '2024-01-01', 'end' => '2026-01-01']))
        ->assertSessionHasErrors('end');

    $this->actingAs($admin)
        ->get(route('unit-analytics.index', ['start' => '2024-01-01', 'end' => '2026-01-01']))
        ->assertSessionHasErrors('end');
});

test('cached shift setting is refreshed when it changes', function () {
    expect(AppSetting::shifts())->toBe(AppSetting::SUPPORTED_SHIFTS);

    AppSetting::set('shifts', ['Shift I']);

    expect(AppSetting::shifts())->toBe(['Shift I']);
});

test('force deleting a unit removes finding closing photos', function () {
    Storage::fake('local');
    $driver = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-F', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $item = P2hInspectionItem::create(['nama_item' => 'Lampu', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 1, 'is_active' => true]);
    auditTlAnswer(auditSessionEntry($driver, $unit, today()), $item);
    Storage::disk('local')->put('p2h-findings/1/foto.jpg', 'x');
    P2hFinding::first()->forceFill(['foto_penutupan' => 'p2h-findings/1/foto.jpg'])->save();

    $this->actingAs(auditAdmin())->delete(route('units.force-delete', $unit->id));

    Storage::disk('local')->assertMissing('p2h-findings/1/foto.jpg');
});
