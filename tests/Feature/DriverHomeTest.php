<?php

use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('driver');
    $this->travelTo(Carbon::parse('2026-10-16 07:00'));
    $this->driver = User::factory()->create();
    $this->driver->assignRole('driver');
});

test('beranda shows the assigned unit with its status, last HM and open findings', function () {
    $unit = Unit::create(['no_unit' => 'DT-1045', 'jenis_unit' => 'Dump Truck', 'status' => 'active']);
    $this->driver->units()->attach($unit);

    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => '2026-10-15', 'status' => 'open', 'created_by' => $this->driver->id]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $this->driver->id, 'user_slot' => 1,
        'shift' => 'Shift I', 'submitted_at' => '2026-10-15 06:10', 'km_awal' => 12480.5, 'kondisi_akhir' => 'Layak Pakai',
    ]);
    UnitDowntimeLog::create(['unit_id' => $unit->id, 'tipe' => 'BD', 'jam_mulai' => '2026-10-15 09:00', 'created_by' => $this->driver->id]);

    // Temuan terbentuk otomatis dari jawaban "Tidak Layak"
    $entry = P2hUserEntry::sole();
    foreach (['Rem parkir', 'Lampu rotary', 'Spion'] as $i => $nama) {
        $item = P2hInspectionItem::firstOrCreate(['nama_item' => $nama], ['section' => 'A', 'kode_bahaya' => 'A', 'urutan' => $i + 1, 'is_active' => true]);
        P2hChecklistAnswer::create([
            'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
            'item_nama' => $nama, 'item_section' => 'A', 'item_kode_bahaya' => 'A', 'item_urutan' => $i + 1,
        ]);
    }
    P2hFinding::where('item_nama', 'Rem parkir')->update(['kode_bahaya' => 'AA', 'target_selesai' => '2026-10-12', 'status' => FindingStatus::Open]);
    P2hFinding::where('item_nama', 'Lampu rotary')->update(['target_selesai' => '2026-10-20', 'status' => FindingStatus::Progress]);
    P2hFinding::where('item_nama', 'Spion')->update(['status' => FindingStatus::Closed, 'closed_at' => now()]);

    $this->actingAs($this->driver)
        ->get('/driver/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->component('driver-dashboard/index')
            ->where('todayUnit.no_unit', 'DT-1045')
            ->where('todayUnit.assigned', true)
            ->where('todayUnit.status', 'BD')
            ->where('todayUnit.hm_terakhir', fn ($hm) => (float) $hm === 12480.5)
            ->where('currentEntry', null)
            ->where('unitFindings.count', 2)
            ->where('unitFindings.overdue', 1)
            ->where('unitFindings.items.0.item_nama', 'Rem parkir')
            ->where('unitFindings.items.0.kritis', true)
        );
});

test('beranda falls back to the last inspected unit and reports this shift entry', function () {
    $unit = Unit::create(['no_unit' => 'LV-034', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => '2026-10-16', 'status' => 'open', 'created_by' => $this->driver->id]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $this->driver->id, 'user_slot' => 1,
        'shift' => 'Shift I', 'submitted_at' => '2026-10-16 06:05', 'kondisi_akhir' => 'Layak Pakai', 'approval_status' => 'pending',
    ]);

    $this->actingAs($this->driver)
        ->get('/driver/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->where('todayUnit.no_unit', 'LV-034')
            ->where('todayUnit.assigned', false)
            ->where('todayUnit.status', 'Ready')
            ->where('currentEntry.no_unit', 'LV-034')
            ->where('currentEntry.submitted_at', '06:05')
            ->where('currentEntry.approval_status', 'pending')
            ->where('sudahP2hShiftIni', true)
        );
});

test('riwayat rows summarise drivers, result, approval and last HM', function () {
    $unit = Unit::create(['no_unit' => 'DT-1022', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $other = User::factory()->create(['name' => 'Sari Maharani'])->assignRole('driver');
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => '2026-10-16', 'status' => 'open', 'created_by' => $this->driver->id]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $this->driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => '2026-10-16 05:52', 'kondisi_akhir' => 'Layak Pakai', 'approval_status' => 'approved', 'hm_km_akhir' => 12490,
    ]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $other->id, 'user_slot' => 2, 'shift' => 'Shift I',
        'submitted_at' => '2026-10-16 06:05', 'kondisi_akhir' => 'BD', 'approval_status' => 'pending',
    ]);

    $this->actingAs($this->driver)
        ->get('/p2h')
        ->assertInertia(fn (Assert $page) => $page
            ->component('p2h/index')
            ->where('sessions.data.0.entries.0.time', '05:52')
            ->where('sessions.data.0.entries.1.driver', 'Sari Maharani')
            ->where('sessions.data.0.hasil', 'BD')
            ->where('sessions.data.0.approval', 'pending')
            ->where('sessions.data.0.hm_akhir', fn ($hm) => (float) $hm === 12490.0)
        );
});

test('beranda without any unit returns empty unit data', function () {
    $this->actingAs($this->driver)
        ->get('/driver/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->where('todayUnit', null)
            ->where('unitFindings.count', 0)
        );
});
