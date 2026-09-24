<?php

use App\Ai\Agents\P2hDailySummaryAgent;
use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['admin', 'manager', 'driver'] as $role) {
        Role::findOrCreate($role);
    }
});

function summaryAdmin(): User
{
    return tap(User::factory()->create(), fn (User $u) => $u->assignRole('admin'));
}

/** Buat sesi P2H hari ini dengan satu item Tidak Layak + finding. */
function p2hWithFinding(Unit $unit, ?User $pic = null, $tanggal = null): P2hFinding
{
    $driver = User::factory()->create(['name' => 'Budi Driver']);
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => $tanggal ?? today(), 'status' => 'open', 'created_by' => $driver->id]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1,
        'shift' => 'Shift I', 'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai',
        'pic_approver_id' => $pic?->id,
    ]);
    $answer = P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $entry->id, 'kondisi' => 'Tidak Layak', 'keterangan' => 'Kampas tipis',
        'item_nama' => 'Rem', 'item_section' => 'A', 'item_kode_bahaya' => 'AA', 'item_urutan' => 1,
        'inspection_item_id' => P2hInspectionItem::create([
            'nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true,
        ])->id,
    ]);

    return P2hFinding::recordFromAnswer($answer, $entry, $unit, $session->tanggal);
}

test('submitting P2H with a Tidak Layak item records a finding with PIC approver as default PIC', function () {
    Storage::fake('local');
    Storage::fake('public');
    $user = User::factory()->create(['jenis_unit' => 'Bus']);
    $user->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-10', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $user->units()->attach($unit);
    $rem = P2hInspectionItem::create(['nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);
    $lampu = P2hInspectionItem::create(['nama_item' => 'Lampu', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 2, 'is_active' => true]);

    $this->actingAs($user)->post(route('p2h.store'), [
        'unit_id' => $unit->id,
        'shift' => 'Shift I',
        'paraf' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=',
        'kondisi_akhir' => 'BD',
        'justifikasi_kondisi' => 'Rem bermasalah',
        'answers' => [
            ['inspection_item_id' => $rem->id, 'kondisi' => 'Tidak Layak', 'keterangan' => 'Kampas tipis'],
            ['inspection_item_id' => $lampu->id, 'kondisi' => 'Layak'],
        ],
    ])->assertSessionHasNoErrors();

    expect(P2hFinding::count())->toBe(1)
        ->and(P2hFinding::first())
        ->item_nama->toBe('Rem')
        ->keterangan->toBe('Kampas tipis')
        ->unit_id->toBe($unit->id)
        ->status->toBe(FindingStatus::Open);
});

test('digest lists only P2H and findings within the selected date, scoped by site', function () {
    $siteA = Site::create(['name' => 'Site A', 'status' => 'active']);
    $siteB = Site::create(['name' => 'Site B', 'status' => 'active']);
    $pic = User::factory()->create(['name' => 'Andi PIC']);
    $inspected = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $siteA->id]);
    $oldUnit = Unit::create(['no_unit' => 'LV-02', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $siteA->id]);
    $otherSite = Unit::create(['no_unit' => 'LV-99', 'jenis_unit' => 'Light Vehicle', 'status' => 'active', 'site_id' => $siteB->id]);

    p2hWithFinding($inspected, $pic)->update(['tindakan_perbaikan' => 'Ganti kampas rem']);
    p2hWithFinding($oldUnit, $pic, today()->subDays(3)); // temuan lama yang masih open
    p2hWithFinding($otherSite, $pic);

    $digest = DailyP2hDigest::build(today(), today(), $siteA->id);

    expect($digest['stats']['sudah_p2h'])->toBe(1)
        ->and($digest['stats']['temuan'])->toBe(1)
        ->and($digest['units'][0]['no_unit'])->toBe('LV-01')
        ->and($digest['units'][0]['findings'][0]['pic'])->toBe('Andi PIC')
        ->and($digest)->not->toHaveKey('carry_over');

    $text = P2hDigestFormatter::toWhatsApp($digest);

    expect($text)->toContain('DAILY REPORT P2H', 'LV-01', 'Rem', 'Ganti kampas rem', 'Andi PIC', '🔴 Open')
        ->not->toContain('LV-99')
        ->not->toContain('LV-02')
        ->not->toContain('SEBELUMNYA');
});

test('digest over a date range includes every P2H in the range grouped by date', function () {
    $pic = User::factory()->create(['name' => 'Andi PIC']);
    $unit = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    p2hWithFinding($unit, $pic, today()->subDays(2));
    p2hWithFinding($unit, $pic, today()->subDays(10)); // di luar rentang

    $digest = DailyP2hDigest::build(today()->subDays(3), today());

    expect($digest['multi_hari'])->toBeTrue()
        ->and($digest['stats']['sudah_p2h'])->toBe(1)
        ->and($digest['units'][0]['tanggal'])->toBe(today()->subDays(2)->toDateString());

    expect(P2hDigestFormatter::toWhatsApp($digest))
        ->toContain('🗓️ _'.today()->subDays(2)->locale('id')->translatedFormat('l, d F Y').'_')
        ->not->toContain(today()->subDays(10)->locale('id')->translatedFormat('d F Y'));
});

test('daily report rejects ranges longer than 31 days', function () {
    $this->actingAs(summaryAdmin())
        ->get(route('p2h.daily-summary', ['start' => today()->subDays(40)->toDateString(), 'end' => today()->toDateString()]))
        ->assertSessionHasErrors('end');
});

test('digest can be filtered by unit type', function () {
    p2hWithFinding(Unit::create(['no_unit' => 'LV-11', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']));
    p2hWithFinding(Unit::create(['no_unit' => 'BUS-11', 'jenis_unit' => 'Bus', 'status' => 'active']));

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today(), today(), null, 'Bus'));

    expect($text)->toContain('BUS-11', '🚙 Bus')->not->toContain('LV-11');
});

test('admin can view the daily summary page', function () {
    $this->actingAs(summaryAdmin())
        ->get(route('p2h.daily-summary'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('p2h/daily-summary')
            ->has('template')
            ->where('filters.start', today()->toDateString())
            ->where('filters.end', today()->toDateString()));
});

test('driver cannot access the daily summary or update findings', function () {
    $driver = User::factory()->create();
    $driver->assignRole('driver');
    $finding = p2hWithFinding(Unit::create(['no_unit' => 'LV-05', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']));

    $this->actingAs($driver)->get(route('p2h.daily-summary'))->assertForbidden();
    $this->actingAs($driver)->patch(route('p2h.findings.update', $finding), ['status' => 'closed'])->assertForbidden();
});

test('AI summary returns the agent text when configured', function () {
    config(['ai.providers.gemini.key' => 'test-key', 'p2h.ai_summary.enabled' => true]);
    P2hDailySummaryAgent::fake(['*LAPORAN AI*']);

    $this->actingAs(summaryAdmin())
        ->postJson(route('p2h.daily-summary.ai'), ['start' => today()->toDateString(), 'end' => today()->toDateString()])
        ->assertOk()
        ->assertJson(['text' => '*LAPORAN AI*', 'fallback' => false]);

    P2hDailySummaryAgent::assertPrompted(fn ($prompt) => str_contains($prompt->prompt, today()->toDateString()));
});

test('AI summary falls back to the template when the provider fails', function () {
    config(['ai.providers.gemini.key' => 'test-key', 'p2h.ai_summary.enabled' => true]);
    P2hDailySummaryAgent::fake(fn () => throw new RuntimeException('quota exceeded'));

    $this->actingAs(summaryAdmin())
        ->postJson(route('p2h.daily-summary.ai'))
        ->assertOk()
        ->assertJson(['fallback' => true])
        ->assertJsonPath('text', fn (string $text) => str_contains($text, 'DAILY REPORT P2H'));
});

test('AI summary falls back to the template when no API key is set', function () {
    config(['ai.providers.gemini.key' => null]);
    P2hDailySummaryAgent::fake(['should not be used']);

    $this->actingAs(summaryAdmin())
        ->postJson(route('p2h.daily-summary.ai'))
        ->assertOk()
        ->assertJson(['fallback' => true]);

    P2hDailySummaryAgent::assertNeverPrompted();
});

test('manager can assign PIC, repair action and close a finding', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');
    $pic = User::factory()->create();
    $finding = p2hWithFinding(Unit::create(['no_unit' => 'LV-07', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']));

    Storage::fake('local');

    $this->actingAs($manager)->post(route('p2h.findings.update', $finding), [
        '_method' => 'patch',
        'foto_penutupan' => UploadedFile::fake()->image('bukti.jpg'),
        'tindakan_perbaikan' => 'Ganti kampas rem',
        'pic_user_id' => $pic->id,
        'target_selesai' => today()->addDay()->toDateString(),
        'status' => 'closed',
        'catatan_penutupan' => 'Sudah dicek ulang',
    ])->assertSessionHasNoErrors();

    expect($finding->fresh())
        ->tindakan_perbaikan->toBe('Ganti kampas rem')
        ->pic_user_id->toBe($pic->id)
        ->status->toBe(FindingStatus::Closed)
        ->closed_by->toBe($manager->id)
        ->closed_at->not->toBeNull();
});
