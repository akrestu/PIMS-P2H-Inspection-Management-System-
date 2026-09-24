<?php

use App\Models\P2hChecklistAnswer;
use App\Models\P2hFinding;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Support\Facades\DB;

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
        ->toContain('⚖️ *BD — Tidak Layak Operasi* _(sesuai rekomendasi sistem)_')
        ->toContain('📝 Rem tidak pakem saat uji jalan', '⛔ *AA*', '⛔ AA = bahaya kritis');
});

test('daily report flags a Layak decision that overrides a BD recommendation', function () {
    $entry = integrityEntry('Layak Pakai', 'Sudah diperbaiki di lokasi');
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Rem', 'Tidak Layak', 'AA', 'Kampas tipis'));

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today()));

    expect($text)->toContain('⚖️ *Layak Pakai* _(⚠️ berbeda dari rekomendasi sistem: BD)_', 'Sudah diperbaiki di lokasi');
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
        ->toContain('🔧 *Temuan (3)*', '2. APAR — Tidak ada', '3. Traffic cone — Tidak ada')
        ->not->toContain('APAR*')
        ->not->toContain('[A]')
        ->and(substr_count($text, 'PIC: Zaki Muhammad'))->toBe(1)
        ->and(substr_count($text, '📌 Status: 🔴 Open'))->toBe(1);
});

test('findings with different PIC or status show those details per finding on one line', function () {
    $entry = integrityEntry();
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Lampu', 'Tidak Layak', 'A', 'Mati'));
    P2hChecklistAnswer::create(integrityAnswer($entry, 'Klakson', 'Tidak Layak', 'A', 'Lemah'));
    P2hFinding::where('item_nama', 'Lampu')->update(['status' => 'progress', 'tindakan_perbaikan' => 'Ganti bohlam']);

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today()));

    expect($text)
        ->toContain('↳ 🛠️ Tindakan: Ganti bohlam · 📌 Status: 🟡 On Progress')
        ->toContain('👤 PIC: _Belum ditunjuk_');
});
