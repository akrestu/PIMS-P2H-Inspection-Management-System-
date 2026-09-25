<?php

use App\Models\P2hChecklistAnswer;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\LvP2hApprovalRequest;
use App\Policies\P2hSessionPolicy;
use App\Support\PendingApprovalCache;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['driver', 'admin', 'manager'] as $role) {
        Role::findOrCreate($role);
    }
});

function approvalDriver(string $jabatan): User
{
    $user = User::factory()->create(['jabatan' => $jabatan, 'department' => 'Operasional']);
    $user->assignRole('driver');

    return $user;
}

function pendingLvEntry(User $submitter, User $pic, array $attributes = []): P2hUserEntry
{
    $unit = Unit::create([
        'no_unit' => 'LV-'.fake()->unique()->numerify('###'),
        'jenis_unit' => 'Light Vehicle',
        'department' => 'Operasional',
        'status' => 'active',
    ]);
    $session = P2hSession::create([
        'unit_id' => $unit->id, 'tanggal' => today(), 'status' => 'open', 'created_by' => $submitter->id,
    ]);

    return P2hUserEntry::create([
        'p2h_session_id' => $session->id,
        'user_id' => $submitter->id,
        'user_slot' => 1,
        'shift' => 'Shift I',
        'submitted_at' => now(),
        'approval_status' => 'pending',
        'pic_approver_id' => $pic->id,
        ...$attributes,
    ]);
}

function workflowSignature(): string
{
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=';
}

test('pic of one session cannot view an unrelated session', function () {
    $pic = approvalDriver(User::JABATAN_APPROVAL);
    $ownEntry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $pic);
    $otherEntry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), approvalDriver(User::JABATAN_APPROVAL));

    $policy = new P2hSessionPolicy;

    expect($policy->view($pic, $ownEntry->session))->toBeTrue()
        ->and($policy->view($pic, $otherEntry->session))->toBeFalse();
});

test('only approval jabatan may approve lv entries while user lv 2 keeps monitoring access', function () {
    $lv2 = approvalDriver(User::JABATAN_USER_LV2);
    $approver = approvalDriver(User::JABATAN_APPROVAL);

    expect($lv2->canApproveLv())->toBeFalse()
        ->and($lv2->canViewMonitoring())->toBeTrue()
        ->and($lv2->needsLvApproval())->toBeTrue()
        ->and($approver->canApproveLv())->toBeTrue()
        ->and($approver->needsLvApproval())->toBeFalse();

    // Entry lama yang PIC-nya masih User LV 2 tidak bisa diproses olehnya
    $entry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $lv2);

    $this->actingAs($lv2)
        ->patch(route('p2h.approve', $entry), ['signature' => workflowSignature()])
        ->assertForbidden();

    expect($entry->fresh()->approval_status)->toBe('pending');
});

test('p2h form offers only approval jabatan drivers as pic', function () {
    $submitter = approvalDriver(User::JABATAN_USER_LV2);
    $approver = approvalDriver(User::JABATAN_APPROVAL);
    approvalDriver(User::JABATAN_USER_LV2);

    $this->actingAs($submitter)
        ->get(route('p2h.create'))
        ->assertInertia(fn ($page) => $page
            ->has('staffUsers', 1)
            ->where('staffUsers.0.id', $approver->id));
});

test('shift end is the first shift end time after submission', function () {
    $entry = new P2hUserEntry(['shift' => 'Shift II']);

    $entry->submitted_at = Carbon::parse('2026-09-25 20:00');
    expect($entry->shiftEndsAt()->toDateTimeString())->toBe('2026-09-26 06:00:00');

    // Submit setelah tengah malam masih dalam Shift II yang sama
    $entry->submitted_at = Carbon::parse('2026-09-26 02:00');
    expect($entry->shiftEndsAt()->toDateTimeString())->toBe('2026-09-26 06:00:00');

    $entry->shift = 'Shift I';
    $entry->submitted_at = Carbon::parse('2026-09-26 07:30');
    expect($entry->shiftEndsAt()->toDateTimeString())->toBe('2026-09-26 18:00:00');
});

test('pending approvals are escalated to admins once after the shift ends', function () {
    $this->travelTo(Carbon::parse('2026-09-25 10:00'));

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $entry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), approvalDriver(User::JABATAN_APPROVAL));

    $this->artisan('p2h:escalate-pending-approvals')->assertSuccessful();
    expect($admin->notifications()->count())->toBe(0)
        ->and($entry->fresh()->escalated_at)->toBeNull();

    $this->travelTo(Carbon::parse('2026-09-25 18:05'));
    $this->artisan('p2h:escalate-pending-approvals')->assertSuccessful();
    $this->artisan('p2h:escalate-pending-approvals')->assertSuccessful();

    expect($admin->notifications()->count())->toBe(1)
        ->and($admin->notifications()->first()->data['type'])->toBe('lv_approval_escalation')
        ->and($entry->fresh()->escalated_at)->not->toBeNull();
});

test('deciding an entry marks pic request and admin escalation notifications as read', function () {
    $this->travelTo(Carbon::parse('2026-09-25 10:00'));

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $pic = approvalDriver(User::JABATAN_APPROVAL);
    $entry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $pic);
    $pic->notify(new LvP2hApprovalRequest($entry->session, $entry, $entry->user));

    $this->travelTo(Carbon::parse('2026-09-25 19:00'));
    $this->artisan('p2h:escalate-pending-approvals');

    $this->actingAs($pic)
        ->patch(route('p2h.reject', $entry), ['catatan' => 'Foto kurang jelas'])
        ->assertRedirect(route('p2h.approvals'));

    expect($entry->fresh()->approval_status)->toBe('rejected')
        ->and($pic->unreadNotifications()->count())->toBe(0)
        ->and($admin->unreadNotifications()->count())->toBe(0);
});

test('pending approval cache is cleared only for the pic and privileged users', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $pic = approvalDriver(User::JABATAN_APPROVAL);
    $otherApprover = approvalDriver(User::JABATAN_APPROVAL);
    $entry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $pic);

    foreach ([$admin, $pic, $otherApprover] as $user) {
        cache()->put(PendingApprovalCache::key($user->id), 99);
    }

    PendingApprovalCache::forgetFor($entry);

    expect(cache()->has(PendingApprovalCache::key($admin->id)))->toBeFalse()
        ->and(cache()->has(PendingApprovalCache::key($pic->id)))->toBeFalse()
        ->and(cache()->get(PendingApprovalCache::key($otherApprover->id)))->toBe(99)
        ->and(PendingApprovalCache::count($pic))->toBe(1);
});

test('jabatan is required for every user including admins', function () {
    $admin = User::factory()->create(['jabatan' => User::JABATAN_APPROVAL]);
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'Admin Baru',
            'nik' => 'ADM-NEW-1',
            'password' => 'Password123!',
            'role' => 'admin',
        ])
        ->assertSessionHasErrors('jabatan');

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'Driver Baru',
            'nik' => 'DRV-NEW-1',
            'password' => 'Password123!',
            'role' => 'driver',
            'jabatan' => 'Sr.Staff',
            'department' => 'Operasional',
        ])
        ->assertSessionHasErrors('jabatan');
});

test('admin can bulk approve pending lv entries except critical ones and their own', function () {
    Storage::fake('local');
    Storage::fake('public');

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $pic = approvalDriver(User::JABATAN_APPROVAL);

    $normalA = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $pic);
    $normalB = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV2), $pic);
    $critical = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $pic);
    $own = pendingLvEntry($admin, $pic);

    $item = P2hInspectionItem::create(['nama_item' => 'APAR', 'section' => 'A', 'kode_bahaya' => 'AA', 'urutan' => 1, 'is_active' => true]);
    P2hChecklistAnswer::create([
        'p2h_user_entry_id' => $critical->id, 'inspection_item_id' => $item->id, 'kondisi' => 'Tidak Layak',
        'keterangan' => 'Kosong', 'item_nama' => 'APAR', 'item_section' => 'A', 'item_kode_bahaya' => 'AA', 'item_urutan' => 1,
    ]);

    $this->actingAs($admin)
        ->get(route('p2h.approvals'))
        ->assertInertia(fn ($page) => $page->where('bulkApprovable', 2));

    $this->actingAs($admin)
        ->post(route('p2h.approvals.bulk-approve'), ['signature' => workflowSignature()])
        ->assertRedirect(route('p2h.approvals'));

    expect($normalA->fresh()->approval_status)->toBe('approved')
        ->and($normalB->fresh()->approval_status)->toBe('approved')
        ->and($normalA->fresh()->approver_id)->toBe($admin->id)
        ->and($normalA->fresh()->catatan_approval)->toContain('massal')
        // Setiap entry punya file tanda tangan sendiri
        ->and($normalA->fresh()->approver_signature_url)->not->toBe($normalB->fresh()->approver_signature_url)
        ->and($critical->fresh()->approval_status)->toBe('pending')
        ->and($own->fresh()->approval_status)->toBe('pending')
        ->and($normalA->user->notifications()->where('data->type', 'lv_approval_result')->count())->toBe(1);
});

test('only admins may bulk approve', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');
    $approver = approvalDriver(User::JABATAN_APPROVAL);
    $entry = pendingLvEntry(approvalDriver(User::JABATAN_USER_LV1), $approver);

    foreach ([$manager, $approver] as $user) {
        $this->actingAs($user)
            ->post(route('p2h.approvals.bulk-approve'), ['signature' => workflowSignature()])
            ->assertForbidden();
    }

    $this->actingAs($approver)
        ->get(route('p2h.approvals'))
        ->assertInertia(fn ($page) => $page->where('bulkApprovable', null));

    expect($entry->fresh()->approval_status)->toBe('pending');
});
