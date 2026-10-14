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
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
    $this->manager = User::factory()->create()->assignRole('manager');
});

/** Buat P2H dengan beberapa item Tidak Layak; temuan terbentuk otomatis. */
function findingsFor(Unit $unit, array $items)
{
    $driver = User::factory()->create()->assignRole('driver');
    $session = P2hSession::create(['unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $driver->id]);
    $entry = P2hUserEntry::create([
        'p2h_session_id' => $session->id, 'user_id' => $driver->id, 'user_slot' => 1, 'shift' => 'Shift I',
        'submitted_at' => now(), 'kondisi_akhir' => 'Layak Pakai',
    ]);

    foreach ($items as $i => $nama) {
        $item = P2hInspectionItem::firstOrCreate(['nama_item' => $nama], ['section' => 'A', 'kode_bahaya' => 'A', 'urutan' => $i + 1, 'is_active' => true]);
        P2hChecklistAnswer::create([
            'p2h_user_entry_id' => $entry->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
            'item_nama' => $nama, 'item_section' => 'A', 'item_kode_bahaya' => 'A', 'item_urutan' => $i + 1,
        ]);
    }

    return P2hFinding::where('unit_id', $unit->id)->orderBy('id')->get();
}

test('managers can close several findings at once with one shared photo', function () {
    Storage::fake('local');
    $unit = Unit::create(['no_unit' => 'WLV 001', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    [$cone, $chock, $lain] = findingsFor($unit, ['Traffic cone', 'Wheel chock', 'Radio']);

    // Tanpa foto ditolak
    $this->actingAs($this->manager)
        ->post(route('p2h.findings.batch-update'), ['ids' => [$cone->id, $chock->id], 'status' => 'closed'])
        ->assertSessionHasErrors('foto_penutupan');

    $this->actingAs($this->manager)
        ->post(route('p2h.findings.batch-update'), [
            'ids' => [$cone->id, $chock->id],
            'status' => 'closed',
            'catatan_penutupan' => 'Sudah dilengkapi',
            'foto_penutupan' => UploadedFile::fake()->image('bukti.jpg'),
        ])
        ->assertSessionHasNoErrors();

    foreach ([$cone->fresh(), $chock->fresh()] as $f) {
        expect($f->status)->toBe(FindingStatus::Closed)
            ->and($f->closed_by)->toBe($this->manager->id)
            ->and($f->catatan_penutupan)->toBe('Sudah dilengkapi');
        Storage::disk('local')->assertExists($f->foto_penutupan);
    }

    // Setiap temuan punya salinan foto sendiri; file sementara dibersihkan
    expect($cone->fresh()->foto_penutupan)->not->toBe($chock->fresh()->foto_penutupan)
        ->and(Storage::disk('local')->files('p2h-findings/batch'))->toBe([])
        ->and($lain->fresh()->status)->toBe(FindingStatus::Open);
});

test('batch update only changes the fields that were filled in', function () {
    $pic = User::factory()->create()->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'WLV 002', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    [$a, $b] = findingsFor($unit, ['Lampu', 'Klakson']);
    $a->update(['tindakan_perbaikan' => 'Ganti bohlam']);

    $this->actingAs($this->manager)
        ->post(route('p2h.findings.batch-update'), ['ids' => [$a->id, $b->id], 'status' => 'progress', 'pic_user_id' => $pic->id])
        ->assertSessionHasNoErrors();

    expect($a->fresh())->status->toBe(FindingStatus::Progress)->pic_user_id->toBe($pic->id)->tindakan_perbaikan->toBe('Ganti bohlam')
        ->and($b->fresh())->status->toBe(FindingStatus::Progress)->tindakan_perbaikan->toBeNull()
        ->and($pic->notifications()->count())->toBe(2);

    // Tanpa perubahan apa pun ditolak
    $this->actingAs($this->manager)
        ->post(route('p2h.findings.batch-update'), ['ids' => [$a->id]])
        ->assertSessionHasErrors('status');
});

test('drivers cannot batch update findings', function () {
    $driver = User::factory()->create()->assignRole('driver');
    $unit = Unit::create(['no_unit' => 'WLV 003', 'jenis_unit' => 'Light Vehicle', 'status' => 'active']);
    [$f] = findingsFor($unit, ['Spion']);
    $f->update(['pic_user_id' => $driver->id]);

    $this->actingAs($driver)
        ->post(route('p2h.findings.batch-update'), ['ids' => [$f->id], 'status' => 'progress'])
        ->assertForbidden();
});

test('the public link in the daily report carries the same unit type and site filters', function () {
    AppSetting::set('public_report_token', $token = str_repeat('k', 40));
    $site = Site::create(['name' => 'Site Utara', 'status' => 'active']);
    Unit::create(['no_unit' => 'BUS 1', 'jenis_unit' => 'Bus', 'status' => 'active', 'site_id' => $site->id]);
    Unit::create(['no_unit' => 'BUS 2', 'jenis_unit' => 'Bus', 'status' => 'active']);

    $text = P2hDigestFormatter::toWhatsApp(DailyP2hDigest::build(today(), today(), $site->id, 'Bus'));
    $url = route('public.report', $token).'?bulan='.today()->format('Y-m').'&jenis=Bus&site='.$site->id;

    expect($text)->toContain('Rekap bulanan: '.$url);

    $this->get($url)->assertOk()->assertInertia(fn ($page) => $page
        ->where('siteName', 'Site Utara')
        ->where('totalUnit', 1)
        ->where('rows.0.no_unit', 'BUS 1'));
});
