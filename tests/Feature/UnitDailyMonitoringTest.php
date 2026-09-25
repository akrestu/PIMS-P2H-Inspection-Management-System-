<?php

use App\Exports\DailyUnitMonitoringExport;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hFuelLog;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Support\DailyUnitMonitoring;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->travelTo(Carbon::parse('2026-09-25 12:00'));
});

function monitoringEntry(P2hSession $session, User $driver, string $shift, string $submittedAt, array $attributes = []): P2hUserEntry
{
    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => $shift === 'Shift I' ? 1 : 2,
        'shift' => $shift, 'submitted_at' => Carbon::parse($submittedAt), 'kondisi_akhir' => 'Layak Pakai',
        ...$attributes,
    ]);
}

test('daily rows combine shifts, findings with actions, last km and total fuel', function () {
    $driver = User::factory()->create(['name' => 'Budi']);
    $lv = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'BUS-01', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $item = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);

    $session = P2hSession::create(['unit_id' => $lv->id, 'tanggal' => '2026-09-25', 'status' => 'open', 'created_by' => $driver->id]);
    $pagi = monitoringEntry($session, $driver, 'Shift I', '2026-09-25 06:30', ['km_awal' => 1000, 'hm_km_akhir' => 1100]);
    $malam = monitoringEntry($session, $driver, 'Shift II', '2026-09-25 18:30', ['hm_km_akhir' => 1250, 'kondisi_akhir' => 'BD']);
    P2hFuelLog::create(['p2h_user_entry_id' => $pagi->id, 'km_unit' => 1050, 'jumlah_liter' => 20.5]);
    P2hFuelLog::create(['p2h_user_entry_id' => $malam->id, 'km_unit' => 1200, 'jumlah_liter' => 10]);

    // Rem dilaporkan kedua shift → satu temuan gabungan, tampil sekali
    foreach ([$pagi, $malam] as $entry) {
        P2hChecklistAnswer::create([
            'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
            'keterangan' => 'Kampas tipis', 'item_nama' => 'Rem', 'item_section' => 'A', 'item_kode_bahaya' => 'AA', 'item_urutan' => 1,
        ]);
    }
    P2hFinding::first()->update(['tindakan_perbaikan' => 'Ganti kampas rem', 'status' => 'progress']);

    // Entry yang ditolak tidak dihitung
    $rejectedSession = P2hSession::create(['unit_id' => $lv->id, 'tanggal' => '2026-09-24', 'status' => 'open', 'created_by' => $driver->id]);
    monitoringEntry($rejectedSession, $driver, 'Shift I', '2026-09-24 07:00', ['approval_status' => 'rejected']);

    $data = DailyUnitMonitoring::build(Carbon::parse('2026-09-24'), Carbon::parse('2026-09-25'));
    $rows = collect($data['rows'])->keyBy(fn ($r) => $r['no_unit'].'|'.$r['tanggal']);

    $today = $rows['LV-01|2026-09-25'];
    expect($data['rows'][0]['tanggal'])->toBe('2026-09-25') // tanggal terbaru di atas
        ->and($today['terisi'])->toBeTrue()
        ->and($today['shifts'])->toBe(['Shift I', 'Shift II'])
        ->and($today['drivers'])->toBe(['Budi'])
        ->and($today['kondisi'])->toBe('BD')
        ->and($today['km'])->toBe(1250)
        ->and($today['bbm_liter'])->toBe(30.5)
        ->and($today['temuan'])->toHaveCount(1)
        ->and($today['temuan'][0])->toMatchArray(['item' => 'Rem', 'tindakan' => 'Ganti kampas rem', 'status' => 'progress'])
        ->and($rows['LV-01|2026-09-24']['terisi'])->toBeFalse()
        ->and($rows['BUS-01|2026-09-25']['terisi'])->toBeFalse()
        ->and($data['summary'])->toMatchArray(['total' => 4, 'terisi' => 1, 'kosong' => 3, 'temuan' => 1, 'bd' => 1, 'bbm_liter' => 30.5]);

    $onlyMissing = DailyUnitMonitoring::build(Carbon::parse('2026-09-24'), Carbon::parse('2026-09-25'), ['status' => 'kosong']);
    expect($onlyMissing['rows'])->toHaveCount(3);
});

test('only admin and manager can open the page and export excel', function () {
    Excel::fake();
    Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);

    $manager = User::factory()->create();
    $manager->assignRole('manager');
    $driver = User::factory()->create(['jabatan' => User::JABATAN_APPROVAL]);
    $driver->assignRole('driver');

    $this->actingAs($manager)
        ->get(route('unit-monitoring.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('unit-monitoring/index')
            ->where('filters.start', '2026-09-01')
            ->where('rows.total', 25));

    $this->actingAs($manager)
        ->get(route('unit-monitoring.excel', ['start' => '2026-09-20', 'end' => '2026-09-25']))
        ->assertOk();
    Excel::assertDownloaded('monitoring-harian-unit_20260920_20260925.xlsx', fn (DailyUnitMonitoringExport $export) => count($export->array()) > 1);

    $this->actingAs($driver)->get(route('unit-monitoring.index'))->assertForbidden();
    $this->actingAs($driver)->get(route('unit-monitoring.excel'))->assertForbidden();
});

test('date range is limited to 31 days', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('unit-monitoring.index', ['start' => '2026-08-01', 'end' => '2026-09-25']))
        ->assertSessionHasErrors('end');
});
