<?php

use App\Models\AppSetting;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->travelTo(Carbon::parse('2026-10-03 12:00'));
    $this->admin = User::factory()->create()->assignRole('admin');
});

function publicEntry(Unit $unit, string $tanggal, string $kondisi = 'Layak Pakai', bool $temuan = false): void
{
    $driver = User::factory()->create(['name' => 'Driver Rahasia']);
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => $tanggal, 'status' => 'open', 'created_by' => $driver->id]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => Carbon::parse("{$tanggal} 07:00"), 'kondisi_akhir' => $kondisi,
    ]);

    if ($temuan) {
        $item = P2hInspectionItem::firstOrCreate(['nama_item' => 'Rem'], ['section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 1, 'is_active' => true]);
        P2hChecklistAnswer::create([
            'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
            'item_nama' => 'Rem', 'item_section' => 'A', 'item_kode_bahaya' => 'A', 'item_urutan' => 1,
        ]);
    }
}

test('the public report is unavailable until an admin enables the link, and rejects wrong tokens', function () {
    $this->get('/laporan/'.str_repeat('a', 40))->assertNotFound();

    AppSetting::set('public_report_token', 'token-yang-benar-0123456789-abcdefghijklm');

    $this->get('/laporan/token-salah')->assertNotFound();
    $this->get('/laporan/token-yang-benar-0123456789-abcdefghijklm')->assertOk();
});

test('the monthly calendar shows each unit status per day without driver names', function () {
    AppSetting::set('public_report_token', $token = str_repeat('t', 40));
    $lv = Unit::create(['no_unit' => 'WLV 10', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'WLV 9', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    Unit::create(['no_unit' => 'BUS 1', 'jenis_unit' => 'Bus', 'status' => 'active']);
    publicEntry($lv, '2026-10-01');
    publicEntry($lv, '2026-10-02', temuan: true);
    publicEntry($lv, '2026-10-03', 'BD');

    $response = $this->get("/laporan/{$token}?jenis=LV")->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('public/p2h-report')
        ->where('bulanLabel', 'Oktober 2026')
        ->where('totalUnit', 2)
        ->where('hariBerjalan', 3)
        // Urut alami: WLV 9 sebelum WLV 10
        ->where('rows.0.no_unit', 'WLV 9')
        ->where('rows.0.days.0', 'kosong')
        ->where('rows.1.days.0', 'layak')
        ->where('rows.1.days.1', 'temuan')
        ->where('rows.1.days.2', 'bd')
        ->where('rows.1.days.3', null)      // hari yang belum lewat
        ->where('rows.1.hari_p2h', 3)
        ->where('perDay.0', 1));

    expect($response->getContent())->not->toContain('Driver Rahasia');
});

test('admin can enable, regenerate and disable the public link, and the daily report includes it', function () {
    $this->actingAs($this->admin)->post(route('app-settings.public-link'), ['action' => 'enable']);
    $first = AppSetting::publicReportToken();
    expect($first)->toHaveLength(40);

    expect(P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today())))
        ->toContain('Rekap bulanan: '.route('public.report', $first).'?bulan=2026-10');

    $this->actingAs($this->admin)->post(route('app-settings.public-link'), ['action' => 'regenerate']);
    expect(AppSetting::publicReportToken())->not->toBe($first);
    $this->get("/laporan/{$first}")->assertNotFound();

    $this->actingAs($this->admin)->post(route('app-settings.public-link'), ['action' => 'disable']);
    expect(AppSetting::publicReportToken())->toBeNull()
        ->and(P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today())))->not->toContain('Rekap bulanan');
});

test('only admins manage the public link', function () {
    $manager = User::factory()->create()->assignRole('manager');

    $this->actingAs($manager)->post(route('app-settings.public-link'), ['action' => 'enable'])->assertForbidden();
});
