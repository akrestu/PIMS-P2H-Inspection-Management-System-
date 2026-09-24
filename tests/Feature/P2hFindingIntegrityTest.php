<?php

use App\Enums\FindingStatus;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function integrityEntry(string $kondisiAkhir = 'Layak Pakai', ?string $alasan = null): P2hUserEntry
{
    $driver = User::factory()->create(['name' => 'Budi Driver']);
    $unit = Unit::create(['no_unit' => 'LV-77', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $driver->id]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => now(), 'kondisi_akhir' => $kondisiAkhir, 'justifikasi_kondisi' => $alasan,
    ]);
}

function integrityAnswer(P2hUserEntry $entry, string $nama, string $kondisi, string $kode = 'A', ?string $ket = null): array
{
    $item = P2hInspectionItem::create(['nama_item' => $nama, 'section' => 'A', 'kode_bahaya' => $kode, 'urutan' => 1, 'is_active' => true]);

    return [
        'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => $kondisi,
        'keterangan' => $ket, 'item_nama' => $nama, 'item_kode_bahaya' => $kode,
    ];
}

test('every Tidak Layak answer becomes a finding regardless of how it is created', function () {
    $entry = integrityEntry();

    P2hChecklistAnswer::create(integrityAnswer($entry, 'Rem', 'Tidak Layak', 'AA', 'Kampas tipis'));
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Lampu', 'Layak'));

    expect(P2hFinding::count())->toBe(1)
        ->and(P2hFinding::first())->item_nama->toBe('Rem')->keterangan->toBe('Kampas tipis');
});

test('Tidak Layak answers that bypassed model events are synced into findings when reports load', function () {
    $entry = integrityEntry();
    // Simulasi data lama / insert langsung tanpa event model
    DB::table('p2h_checklist_answers')->insert([
        ...integrityAnswer($entry, 'Level Oli', 'Tidak Layak', 'A', 'Kurang'),
        'created_at' => now(), 'updated_at' => now(),
    ]);
    expect(P2hFinding::count())->toBe(0);

    $digest = DailyP2hDigest::build(today());

    expect(P2hFinding::count())->toBe(1)
        ->and($digest['units'][0]['findings'][0]['item'])->toBe('Level Oli');

    // Idempotent: tidak membuat duplikat
    P2hFinding::syncMissing();
    expect(P2hFinding::count())->toBe(1);
});

test('backfill command syncs all missing findings by default', function () {
    $entry = integrityEntry();
    DB::table('p2h_checklist_answers')->insert([
        ...integrityAnswer($entry, 'Ban', 'Tidak Layak'),
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->artisan('p2h:backfill-findings')->expectsOutputToContain('1 temuan dibuat')->assertSuccessful();
});

test('daily report shows the final BD decision, system recommendation and reason', function () {
    $entry = integrityEntry('BD', 'Rem tidak pakem saat uji jalan');
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Rem', 'Tidak Layak', 'AA', 'Kampas tipis'));
    foreach (range(1, 9) as $i) {
        P2hChecklistAnswer::create(integrityAnswer($entry, "Item {$i}", 'Layak'));
    }

    $digest = DailyP2hDigest::build(today());
    $keputusan = $digest['units'][0]['keputusan'];

    expect($keputusan)->toMatchArray([
        'final' => 'BD',
        'rekomendasi_sistem' => 'BD',
        'berbeda_dari_rekomendasi' => false,
        'alasan' => 'Rem tidak pakem saat uji jalan',
    ])->and($digest['units'][0]['kondisi'])->toBe('tidak_layak');

    expect(P2hDigestFormatter::toWhatsApp($digest))
        ->toContain('*1. LV-77*', '*Status:* ❌ *BREAKDOWN (BD)*')
        ->toContain('*Alasan:* _Rem tidak pakem saat uji jalan_', '- Rem — _Kampas tipis_ ⛔ *AA*', '⛔ AA = bahaya kritis')
        ->not->toContain('rekomendasi sistem');
});

test('daily report flags a Layak decision that overrides a BD recommendation', function () {
    $entry = integrityEntry('Layak Pakai', 'Sudah diperbaiki di lokasi');
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Rem', 'Tidak Layak', 'AA', 'Kampas tipis'));

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today()));

    expect($text)->toContain('*Status:* ⚠️ *LAYAK PAKAI — ADA TEMUAN*', '⚠️ _Keputusan tidak sesuai rekomendasi sistem (BD)_', '*Alasan:* _Sudah diperbaiki di lokasi_');
});

test('findings sharing the same PIC, action and status are listed once without repeated lines', function () {
    $pic = User::factory()->create(['name' => 'Zaki Muhammad']);
    $entry = integrityEntry('BD', 'Perlu perbaikan 4x4');
    foreach (['Wipper' => 'Wipper kiri rusak', 'APAR*' => 'Tidak ada', 'Traffic cone*' => 'Tidak ada'] as $item => $ket) {
        P2hChecklistAnswer::create(integrityAnswer($entry, $item, 'Tidak Layak', 'A', $ket));
    }
    P2hFinding::query()->update(['pic_user_id' => $pic->id]);

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today()));

    expect($text)
        ->toContain('*Temuan (3):*', '- APAR — _Tidak ada_', '- Traffic cone — _Tidak ada_', '*PIC:* Zaki Muhammad · *Progress:* 🔴 Open', '*Tindakan:* _Belum ditentukan_')
        ->not->toContain('APAR*')
        ->not->toContain('[A]')
        ->and(substr_count($text, 'Zaki Muhammad'))->toBe(1)
        ->and(substr_count($text, '🔴 Open'))->toBe(1);
});

test('findings with different PIC or status show those details per finding on one line', function () {
    $entry = integrityEntry();
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Lampu', 'Tidak Layak', 'A', 'Mati'));
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Klakson', 'Tidak Layak', 'A', 'Lemah'));
    P2hFinding::where('item_nama', 'Lampu')->update(['status' => 'progress', 'tindakan_perbaikan' => 'Ganti bohlam']);

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today()));

    expect($text)
        ->toContain('- Lampu — _Mati_', '↳ *Progress:* 🟡 On Progress · *Tindakan:* _Ganti bohlam_')
        ->toContain('*PIC:* _Belum ditunjuk_')->not->toContain('━');
});

test('findings from rejected entries or deleted sessions are excluded from reports and reminders', function () {
    Notification::fake();
    $pic = User::factory()->create();

    $rejected = integrityEntry();
    $rejected->update(['approval_status' => 'rejected']);
    P2hChecklistAnswer::create(integrityAnswer($rejected, 'Rem', 'Tidak Layak'));

    $deletedUnit = Unit::create(['no_unit' => 'LV-88', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $deletedSession = P2hSession::create(['unit_id' => $deletedUnit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $pic->id]);
    $deletedEntry = P2hUserEntry::create([
        'p2h_session_id' => $deletedSession->id, 'user_id' => $pic->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai',
    ]);
    P2hChecklistAnswer::create(integrityAnswer($deletedEntry, 'Ban', 'Tidak Layak'));
    $deletedSession->delete();

    P2hFinding::query()->update(['pic_user_id' => $pic->id, 'target_selesai' => today()->subDay()]);

    expect(P2hFinding::count())->toBe(2)
        ->and(P2hFinding::active()->count())->toBe(0)
        ->and(DailyP2hDigest::build(today())['units'])->toBe([]);

    $this->artisan('p2h:remind-overdue-findings')->assertSuccessful();
    Notification::assertNothingSent();
});

test('the same item reported by several shifts on one day is listed once and counted once for recurrence', function () {
    $first = integrityEntry();
    P2hChecklistAnswer::create(integrityAnswer($first, 'Lampu', 'Tidak Layak', 'A', 'Mati'));

    $second = P2hUserEntry::create([
        'p2h_session_id' => $first->p2h_session_id, 'user_id' => User::factory()->create()->id, 'user_slot' => 2,
        'shift' => 'Shift II', 'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai',
    ]);
    P2hChecklistAnswer::create(integrityAnswer($second, 'Lampu', 'Tidak Layak', 'A', 'Masih mati'));

    $digest = DailyP2hDigest::build(today());

    expect($digest['units'][0]['findings'])->toHaveCount(1)
        ->and($digest['units'][0]['findings'][0]['keterangan'])->toBe('Masih mati')
        ->and(P2hFinding::recurrenceCounts(today())->first())->toBe(1);
});

// ── Penggabungan temuan ──────────────────────────────────────────────────────

function integrityEntryOn(Unit $unit, $tanggal, string $shift = 'Shift I'): P2hUserEntry
{
    $driver = User::factory()->create();
    $session = P2hSession::firstOrCreate(['unit_id' => $unit->id, 'tanggal' => $tanggal], ['status' => 'open', 'created_by' => $driver->id]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => $session->userEntries()->count() + 1,
        'shift' => $shift, 'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai',
    ]);
}

test('repeated reports of the same open issue merge into one finding', function () {
    $unit = Unit::create(['no_unit' => 'LV-50', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()->subDays(2)), 'APAR', 'Tidak Layak', 'A', 'Tidak ada'));
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()->subDay()), 'APAR', 'Tidak Layak', 'A', 'Belum tersedia'));
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()), 'apar ', 'Tidak Layak', 'AA', 'Masih belum ada'));

    $finding = P2hFinding::sole();

    expect($finding->jumlah_laporan)->toBe(3)
        ->and($finding->tanggal_temuan->toDateString())->toBe(today()->subDays(2)->toDateString())
        ->and($finding->terakhir_dilaporkan->toDateString())->toBe(today()->toDateString())
        ->and($finding->keterangan)->toBe('Masih belum ada')
        ->and($finding->kode_bahaya)->toBe('AA')
        ->and($finding->answers()->count())->toBe(3);

    // Laporan hari ini tetap menampilkan temuan gabungan, dan berulang dihitung 3 hari
    $digest = DailyP2hDigest::build(today());
    expect($digest['units'][0]['findings'])->toHaveCount(1)
        ->and($digest['units'][0]['findings'][0]['berulang'])->toBe(3);
});

test('a problem reported again after its finding was closed opens a new finding', function () {
    $unit = Unit::create(['no_unit' => 'LV-51', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()->subDays(5)), 'Wiper', 'Tidak Layak'));
    P2hFinding::sole()->update(['status' => 'closed', 'closed_at' => now()]);

    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()), 'Wiper', 'Tidak Layak'));

    expect(P2hFinding::count())->toBe(2)
        ->and(P2hFinding::where('status', 'open')->sole()->jumlah_laporan)->toBe(1);
});

// ── Akses driver ─────────────────────────────────────────────────────────────

test('a driver sees only findings assigned to them and can update their progress', function () {
    Storage::fake('local');
    Role::findOrCreate('driver');
    $driver = tap(User::factory()->create(), fn ($u) => $u->assignRole('driver'));
    $unit = Unit::create(['no_unit' => 'LV-60', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()), 'Rem', 'Tidak Layak'));
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()), 'Lampu', 'Tidak Layak'));
    $mine = P2hFinding::where('item_nama', 'Rem')->sole();
    $other = P2hFinding::where('item_nama', 'Lampu')->sole();
    $mine->update(['pic_user_id' => $driver->id, 'target_selesai' => today()->addDays(3)]);

    $this->actingAs($driver)->get(route('p2h.findings.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('p2h/findings')
            ->where('canManage', false)
            ->has('findings.data', 1)
            ->where('findings.data.0.item_nama', 'Rem'));

    $someoneElse = User::factory()->create();
    $this->actingAs($driver)->post(route('p2h.findings.update', $mine), [
        '_method' => 'patch',
        'status' => 'closed',
        'tindakan_perbaikan' => 'Kampas rem diganti',
        'pic_user_id' => $someoneElse->id,
        'target_selesai' => today()->addMonth()->toDateString(),
        'foto_penutupan' => UploadedFile::fake()->image('bukti.jpg'),
    ])->assertSessionHasNoErrors();

    expect($mine->fresh())
        ->status->toBe(FindingStatus::Closed)
        ->tindakan_perbaikan->toBe('Kampas rem diganti')
        ->pic_user_id->toBe($driver->id)
        ->and($mine->fresh()->target_selesai->toDateString())->toBe(today()->addDays(3)->toDateString());

    $this->actingAs($driver)->patch(route('p2h.findings.update', $other), ['status' => 'progress'])->assertForbidden();
    $this->actingAs($driver)->postJson(route('p2h.findings.suggest', $other))->assertForbidden();
});

test('merge command combines duplicate open findings recorded before merging existed', function () {
    $pic = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'LV-70', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    // Simulasi data lama: 2 temuan terpisah untuk item yang sama
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()->subDay()), 'Wiper', 'Tidak Layak', 'A', 'Rusak'));
    $first = P2hFinding::sole();
    $first->update(['pic_user_id' => $pic->id]);
    $first->update(['status' => 'closed']);
    P2hChecklistAnswer::create(integrityAnswer(integrityEntryOn($unit, today()), 'Wiper', 'Tidak Layak', 'A', 'Masih rusak'));
    $first->update(['status' => 'open']);

    expect(P2hFinding::count())->toBe(2);

    $this->artisan('p2h:merge-duplicate-findings')->assertSuccessful();

    $merged = P2hFinding::sole();
    expect($merged->id)->toBe($first->id)
        ->and($merged->jumlah_laporan)->toBe(2)
        ->and($merged->keterangan)->toBe('Masih rusak')
        ->and($merged->pic_user_id)->toBe($pic->id)
        ->and($merged->answers()->count())->toBe(2);
});
