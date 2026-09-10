<?php

use App\Models\P2hChecklistAnswer;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Support\HistoricalInspectionItems;
use App\Support\SignatureImage;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('driver');
});

function validSignatureDataUrl(): string
{
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=';
}

test('user cannot inspect slot information for an inaccessible unit', function () {
    $user = User::factory()->create(['jenis_unit' => 'Bus']);
    $user->assignRole('driver');
    $allowedUnit = Unit::create(['no_unit' => 'BUS-01', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $blockedUnit = Unit::create(['no_unit' => 'BUS-02', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $user->units()->attach($allowedUnit);

    $this->actingAs($user)
        ->getJson(route('p2h.check-slot', ['unit_id' => $blockedUnit->id]))
        ->assertForbidden();
});

test('all active checklist items must be submitted exactly once', function () {
    $user = User::factory()->create(['jenis_unit' => 'Bus']);
    $user->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-03', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $first = P2hInspectionItem::create([
        'nama_item' => 'Rem', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true,
    ]);
    P2hInspectionItem::create([
        'nama_item' => 'Lampu', 'section' => 'A', 'kode_bahaya' => 'A', 'urutan' => 2, 'is_active' => true,
    ]);

    $this->actingAs($user)->post(route('p2h.store'), [
        'unit_id' => $unit->id,
        'shift' => 'Shift I',
        'paraf' => validSignatureDataUrl(),
        'kondisi_akhir' => 'Layak Pakai',
        'answers' => [
            ['inspection_item_id' => $first->id, 'kondisi' => 'Layak'],
            ['inspection_item_id' => $first->id, 'kondisi' => 'Layak'],
        ],
    ])->assertSessionHasErrors(['answers', 'answers.1.inspection_item_id']);

    $this->assertDatabaseCount('p2h_user_entries', 0);
});

test('invalid approver signature cannot approve an entry', function () {
    $submitter = User::factory()->create();
    $approver = User::factory()->create(['jabatan' => 'Staff']);
    $approver->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'LV-01', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $submitter->id,
    ]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id,
        'user_id' => $submitter->id,
        'user_slot' => 1,
        'shift' => 'Shift I',
        'approval_status' => 'pending',
        'pic_approver_id' => $approver->id,
    ]);

    $this->actingAs($approver)
        ->patch(route('p2h.approve', $entry), ['signature' => 'not-an-image'])
        ->assertSessionHasErrors('signature');

    expect($entry->fresh()->approval_status)->toBe('pending')
        ->and($entry->fresh()->approver_signature_url)->toBeNull();
});

test('signatures are private and only entry participants can read them', function () {
    Storage::fake('local');
    Storage::fake('public');

    $submitter = User::factory()->create();
    $submitter->assignRole('driver');
    $outsider = User::factory()->create();
    $outsider->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'PRIVATE-1', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $submitter->id,
    ]);
    $path = SignatureImage::store(validSignatureDataUrl());
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $submitter->id, 'user_slot' => 1,
        'shift' => 'Shift I', 'paraf_url' => $path,
    ]);

    Storage::disk('local')->assertExists($path);
    Storage::disk('public')->assertMissing($path);
    $this->actingAs($submitter)->get(route('p2h.signature', [$entry, 'submitter']))->assertOk();
    $this->actingAs($outsider)->get(route('p2h.signature', [$entry, 'submitter']))->assertForbidden();
});

test('historical checklist uses the submitted snapshot after master data changes', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'HISTORY-1', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $user->id,
    ]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $user->id, 'user_slot' => 1, 'shift' => 'Shift I',
    ]);
    $item = P2hInspectionItem::create([
        'nama_item' => 'Nama Lama', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true,
    ]);
    P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $entry->id,
        'inspection_item_id' => $item->id,
        'kondisi' => 'Layak',
        'item_nama' => 'Nama Lama',
        'item_section' => 'A',
        'item_kode_bahaya' => 'AA',
        'item_urutan' => 1,
    ]);
    $item->update(['nama_item' => 'Nama Baru', 'is_active' => false]);
    $entry->load('answers.inspectionItem');

    $snapshot = HistoricalInspectionItems::fromEntries(collect([$entry]))->first();
    expect($snapshot->nama_item)->toBe('Nama Lama')
        ->and($snapshot->kode_bahaya)->toBe('AA');
});

test('snapshot migration is safe when columns already exist or data is partially filled', function () {
    $user = User::factory()->create();
    $unit = Unit::create(['no_unit' => 'PARTIAL-1', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $user->id,
    ]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $user->id, 'user_slot' => 1, 'shift' => 'Shift I',
    ]);
    $item = P2hInspectionItem::create([
        'nama_item' => 'Master Saat Ini', 'section' => 'B', 'kode_bahaya' => 'A', 'urutan' => 9, 'is_active' => true,
    ]);
    $answer = P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $entry->id,
        'inspection_item_id' => $item->id,
        'kondisi' => 'Layak',
        'item_nama' => 'Snapshot Yang Harus Dipertahankan',
    ]);

    $migration = require database_path('migrations/2026_09_10_000002_snapshot_p2h_inspection_items.php');
    $migration->up();

    $answer->refresh();
    expect($answer->item_nama)->toBe('Snapshot Yang Harus Dipertahankan')
        ->and($answer->item_section)->toBe('B')
        ->and($answer->item_kode_bahaya)->toBe('A')
        ->and($answer->item_urutan)->toBe(9);
});

test('next slot remains unique after an entry is soft deleted', function () {
    $user = User::factory()->create(['jenis_unit' => 'Bus']);
    $user->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'BUS-04', 'jenis_unit' => 'Bus', 'status' => 'active']);
    $session = P2hSession::create([
        'unit_id' => $unit->id,
        'tanggal' => today(),
        'status' => 'open',
        'created_by' => $user->id,
    ]);
    $first = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $user->id, 'user_slot' => 1, 'shift' => 'Shift I',
    ]);
    P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $user->id, 'user_slot' => 2, 'shift' => 'Shift II',
    ]);
    $first->delete();

    $this->actingAs($user)
        ->getJson(route('p2h.check-slot', ['unit_id' => $unit->id]))
        ->assertOk()
        ->assertJsonPath('slot_terisi', 1)
        ->assertJsonPath('next_slot', 3);
});
