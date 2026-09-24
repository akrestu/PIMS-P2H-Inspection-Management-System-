<?php

use App\Ai\Agents\P2hPeriodReportAgent;
use App\Ai\Agents\P2hRepairSuggestionAgent;
use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hFuelLog;
use App\Models\P2hInspectionItem;
use App\Models\P2hServiceInfo;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\FindingAssigned;
use App\Notifications\FindingOverdue;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use App\Support\PeriodP2hReport;
use App\Support\UnitUsageAnalytics;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['admin', 'manager', 'driver'] as $role) {
        Role::findOrCreate($role);
    }
});

function monitoringManager(): User
{
    return tap(User::factory()->create(['name' => 'Maya Manager']), fn (User $u) => $u->assignRole('manager'));
}

function lvUnit(string $no = 'LV-01', string $jenis = 'Light Vehicle'): Unit
{
    return Unit::create(['no_unit' => $no, 'jenis_unit' => $jenis, 'status' => 'active']);
}

/** Satu entry P2H pada tanggal tertentu, opsional dengan KM, BBM, servis, dan item Tidak Layak. */
function p2hEntry(Unit $unit, $tanggal, ?int $km = null, ?float $liter = null, bool $servis = false, ?string $itemTl = null): P2hUserEntry
{
    $driver = User::factory()->create();
    $session = P2hSession::firstOrCreate(
        ['unit_id' => $unit->id, 'tanggal' => $tanggal],
        ['status' => 'open', 'created_by' => $driver->id],
    );
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => $session->userEntries()->count() + 1,
        'shift' => 'Shift I', 'submitted_at' => $tanggal, 'kondisi_akhir' => 'Layak Pakai', 'km_awal' => $km,
    ]);

    if ($liter !== null) {
        P2hFuelLog::create(['p2h_user_entry_id' => $entry->id, 'km_unit' => $km, 'jumlah_liter' => $liter]);
    }

    if ($servis) {
        P2hServiceInfo::updateOrCreate(['p2h_session_id' => $session->id], ['servis_berkala' => true]);
    }

    if ($itemTl) {
        $item = P2hInspectionItem::firstOrCreate(['nama_item' => $itemTl], ['section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 1, 'is_active' => true]);
        $answer = P2hChecklistAnswer::create([
            'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
            'item_nama' => $itemTl, 'item_kode_bahaya' => 'A',
        ]);
        P2hFinding::recordFromAnswer($answer, $entry, $unit, $session->tanggal);
    }

    return $entry;
}

// ── #2 Notifikasi PIC & pengingat overdue ────────────────────────────────────

test('assigning a new PIC notifies that user', function () {
    Notification::fake();
    $pic = User::factory()->create();
    $finding = p2hEntry(lvUnit(), today(), itemTl: 'Rem')->findings()->first();

    $this->actingAs(monitoringManager())
        ->patch(route('p2h.findings.update', $finding), ['status' => 'progress', 'pic_user_id' => $pic->id])
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($pic, FindingAssigned::class);
});

test('overdue reminder notifies the PIC once per day', function () {
    Notification::fake();
    $pic = User::factory()->create();
    $finding = p2hEntry(lvUnit(), today()->subDays(5), itemTl: 'Rem')->findings()->first();
    $finding->update(['pic_user_id' => $pic->id, 'target_selesai' => today()->subDays(2)]);
    p2hEntry(lvUnit('LV-02'), today(), itemTl: 'Lampu')->findings()->first()
        ->update(['pic_user_id' => $pic->id, 'target_selesai' => today()->addDay()]);

    $this->artisan('p2h:remind-overdue-findings')->assertSuccessful();
    $this->artisan('p2h:remind-overdue-findings')->assertSuccessful();

    Notification::assertSentToTimes($pic, FindingOverdue::class, 1);
    expect($finding->fresh()->isOverdue())->toBeTrue();
});

// ── #3 Foto bukti perbaikan ──────────────────────────────────────────────────

test('closing a finding requires a repair photo and stores it privately', function () {
    Storage::fake('local');
    $finding = p2hEntry(lvUnit(), today(), itemTl: 'Rem')->findings()->first();
    $manager = monitoringManager();

    $this->actingAs($manager)
        ->patch(route('p2h.findings.update', $finding), ['status' => 'closed'])
        ->assertSessionHasErrors('foto_penutupan');

    $this->actingAs($manager)
        ->post(route('p2h.findings.update', $finding), [
            '_method' => 'patch',
            'status' => 'closed',
            'foto_penutupan' => UploadedFile::fake()->image('bukti.jpg'),
        ])
        ->assertSessionHasNoErrors();

    $finding->refresh();
    expect($finding->status)->toBe(FindingStatus::Closed)->and($finding->foto_penutupan)->not->toBeNull();
    Storage::disk('local')->assertExists($finding->foto_penutupan);
    $this->actingAs($manager)->get(route('p2h.findings.photo', $finding))->assertOk();
});

// ── #4 Temuan berulang ───────────────────────────────────────────────────────

test('the same item failing 3 times in 30 days is flagged as recurring', function () {
    $unit = lvUnit();
    p2hEntry($unit, today()->subDays(20), itemTl: 'Rem');
    p2hEntry($unit, today()->subDays(10), itemTl: 'Rem');
    p2hEntry($unit, today(), itemTl: 'Rem');
    p2hEntry($unit, today(), itemTl: 'Lampu');

    $digest = DailyP2hDigest::build(today());
    $findings = collect($digest['units'][0]['findings'])->keyBy('item');

    expect($findings['Rem']['berulang'])->toBe(3)
        ->and($findings['Lampu']['berulang'])->toBeNull()
        ->and(P2hDigestFormatter::toWhatsApp($digest))->toContain('🔁 *Berulang 3x / 30 hari*');
});

// ── #5 Analitik BBM ──────────────────────────────────────────────────────────

test('fuel analytics computes km per liter, ignores odometer typos and flags wasteful units', function () {
    $efficient = lvUnit('LV-A');
    p2hEntry($efficient, today()->subDays(3), km: 10000, liter: 40);
    p2hEntry($efficient, today()->subDays(2), km: 999999); // salah ketik → diabaikan
    p2hEntry($efficient, today()->subDay(), km: 10400, liter: 40);

    $wasteful = lvUnit('LV-B');
    p2hEntry($wasteful, today()->subDays(3), km: 5000, liter: 40);
    p2hEntry($wasteful, today()->subDay(), km: 5100, liter: 40);

    $fuel = collect(UnitUsageAnalytics::fuel(today()->subDays(7), today())['units'])->keyBy('no_unit');

    expect($fuel['LV-A']['jarak'])->toBe(400)
        ->and($fuel['LV-A']['km_per_liter'])->toEqual(5.0)
        ->and($fuel['LV-A']['boros'])->toBeFalse()
        ->and($fuel['LV-B']['km_per_liter'])->toEqual(1.25)
        ->and($fuel['LV-B']['boros'])->toBeTrue();
});

test('a large refuel shortly after the previous one is flagged as an anomaly', function () {
    $unit = lvUnit();
    p2hEntry($unit, today()->subDays(2), km: 1000, liter: 40);
    p2hEntry($unit, today()->subDay(), km: 1005, liter: 35);

    $fuel = UnitUsageAnalytics::fuel(today()->subDays(7), today());

    expect($fuel['jumlah_anomali'])->toBe(1)
        ->and($fuel['units'][0]['anomali'][0]['jarak_sejak_isi_sebelumnya'])->toBe(5);
});

// ── #6 Pengingat servis ──────────────────────────────────────────────────────

test('service forecast marks units due soon or overdue from the last periodic service', function () {
    config(['p2h.service.interval_km.Light Vehicle' => 5000, 'p2h.service.due_soon_km' => 500]);

    $dueSoon = lvUnit('LV-SOON');
    p2hEntry($dueSoon, today()->subDays(20), km: 10000, servis: true);
    p2hEntry($dueSoon, today(), km: 10800);
    for ($km = 11500; $km <= 14700; $km += 800) {
        p2hEntry($dueSoon, today(), km: $km);
    }

    $overdue = lvUnit('LV-LATE');
    p2hEntry($overdue, today()->subDays(20), km: 20000, servis: true);
    foreach ([21000, 22000, 23000, 24000, 25200] as $km) {
        p2hEntry($overdue, today(), km: $km);
    }

    lvUnit('LV-NEW');

    $forecast = collect(UnitUsageAnalytics::serviceForecast())->keyBy('no_unit');

    expect($forecast['LV-SOON']['status'])->toBe('due_soon')
        ->and($forecast['LV-SOON']['sisa_km'])->toBe(300)
        ->and($forecast['LV-LATE']['status'])->toBe('overdue')
        ->and($forecast['LV-NEW']['status'])->toBe('unknown');

    expect(P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today())))
        ->toContain('JADWAL SERVIS BERKALA', 'LV-SOON', 'LV-LATE')
        ->not->toContain('LV-NEW');
});

// ── #8 Periodic report ───────────────────────────────────────────────────────

test('period report summarises compliance, findings and ranks top items', function () {
    $unit = lvUnit();
    p2hEntry($unit, today(), itemTl: 'Rem');
    p2hEntry($unit, today(), itemTl: 'Lampu');
    p2hEntry(lvUnit('LV-02'), today(), itemTl: 'Rem');

    [$start, $end] = PeriodP2hReport::resolvePeriod('custom', today()->toDateString(), today()->toDateString());
    $report = PeriodP2hReport::build($start, $end);

    expect($report['kepatuhan']['p2h_masuk'])->toBe(2)
        ->and($report['temuan']['total'])->toBe(3)
        ->and($report['item_teratas'][0])->toBe(['item' => 'Rem', 'jumlah' => 2])
        ->and(PeriodP2hReport::toWhatsApp($report))->toContain('PERIODIC REPORT P2H', '*A. KEPATUHAN P2H*', 'Rem - 2x');
});

test('period report page, AI analysis and PDF export work for managers', function () {
    config(['ai.providers.gemini.key' => 'test-key', 'p2h.ai_summary.enabled' => true]);
    P2hPeriodReportAgent::fake(['1. Kepatuhan rendah.']);
    $manager = monitoringManager();

    $this->actingAs($manager)->get(route('p2h.period-report', ['period' => 'this_month']))->assertOk();
    $this->actingAs($manager)
        ->postJson(route('p2h.period-report.ai'), ['period' => 'last_week'])
        ->assertOk()
        ->assertJson(['fallback' => false])
        ->assertJsonPath('text', fn (string $t) => str_contains($t, '*A. KEPATUHAN P2H*') && str_contains($t, 'ANALISIS & REKOMENDASI') && str_contains($t, '1. Kepatuhan rendah.'));
    $this->actingAs($manager)
        ->get(route('p2h.period-report.pdf', ['period' => 'this_week']))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

// ── #9 Saran tindakan AI ─────────────────────────────────────────────────────

test('AI suggests a repair action using similar closed findings as context', function () {
    config(['ai.providers.gemini.key' => 'test-key', 'p2h.ai_summary.enabled' => true]);
    P2hRepairSuggestionAgent::fake(['Ganti kampas rem depan dan cek minyak rem.']);
    $closed = p2hEntry(lvUnit('LV-09'), today()->subDays(10), itemTl: 'Rem')->findings()->first();
    $closed->update(['status' => 'closed', 'tindakan_perbaikan' => 'Ganti kampas rem', 'closed_at' => now()]);
    $finding = p2hEntry(lvUnit(), today(), itemTl: 'Rem')->findings()->first();

    $this->actingAs(monitoringManager())
        ->postJson(route('p2h.findings.suggest', $finding))
        ->assertOk()
        ->assertJson(['suggestion' => 'Ganti kampas rem depan dan cek minyak rem.']);

    P2hRepairSuggestionAgent::assertPrompted(fn ($prompt) => str_contains($prompt->prompt, 'Ganti kampas rem'));
});

test('AI suggestion reports unavailability when not configured', function () {
    config(['ai.providers.gemini.key' => null]);
    $finding = p2hEntry(lvUnit(), today(), itemTl: 'Rem')->findings()->first();

    $this->actingAs(monitoringManager())
        ->postJson(route('p2h.findings.suggest', $finding))
        ->assertStatus(422);
});

test('drivers cannot access the new monitoring pages', function () {
    $driver = User::factory()->create();
    $driver->assignRole('driver');

    $this->actingAs($driver)->get(route('p2h.period-report'))->assertForbidden();
    $this->actingAs($driver)->get(route('unit-analytics.index'))->assertForbidden();
});

test('unit analytics page renders for managers', function () {
    p2hEntry(lvUnit(), today(), km: 1000, liter: 30);

    $this->actingAs(monitoringManager())->get(route('unit-analytics.index'))->assertOk();
});
