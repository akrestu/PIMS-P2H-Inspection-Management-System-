<?php

namespace App\Http\Controllers;

use App\Models\P2hUserEntry;
use App\Models\User;
use App\Notifications\LvP2hApprovalResult;
use App\Rules\ValidSignatureDataUrl;
use App\Support\HistoricalInspectionItems;
use App\Support\P2hFileStorage;
use App\Support\PendingApprovalCache;
use App\Support\SignatureImage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class P2hApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate(['status' => 'nullable|in:pending,approved,rejected']);
        $user = $request->user();

        abort_unless($user->canApproveLv(), 403);

        $query = P2hUserEntry::with([
            'user:id,name,nik,jabatan,department',
            'session.unit:id,no_unit,jenis_unit,department',
            'pic:id,name,jabatan',
            'approver:id,name',
            'answers.inspectionItem',
        ])
            ->whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'))
            ->when(
                // Approver non-admin hanya lihat yang mereka ditunjuk sebagai PIC
                ! $user->isPrivileged(),
                fn ($q) => $q->where('pic_approver_id', $user->id)
            )
            ->when($request->status ?? 'pending', fn ($q, $s) => $q->where('approval_status', $s))
            ->latest('submitted_at');

        $entries = $query->paginate(20)->withQueryString();

        $mapped = $entries->through(function ($entry) {
            $totalItems = $entry->answers->count();
            $layakCount = $entry->answers->where('kondisi', 'Layak')->count();
            $tlCount = $entry->answers->where('kondisi', 'Tidak Layak')->count();
            $score = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;
            // Snapshot kode bahaya saat P2H diisi, bukan master item yang bisa berubah
            $hasCritical = $entry->answers->contains(
                fn ($a) => $a->kondisi === 'Tidak Layak' && ($a->item_kode_bahaya ?? $a->inspectionItem?->kode_bahaya) === 'AA'
            );

            return [
                'id' => $entry->id,
                'session_id' => $entry->p2h_session_id,
                'no_unit' => $entry->session->unit->no_unit ?? '-',
                'jenis_unit' => $entry->session->unit->jenis_unit ?? '-',
                'department' => $entry->session->unit->department ?? '-',
                'tanggal' => $entry->session->tanggal?->format('d/m/Y'),
                'shift' => $entry->shift,
                'driver_name' => $entry->user->name ?? '-',
                'driver_nik' => $entry->user->nik ?? '-',
                'driver_jabatan' => $entry->user->jabatan ?? '-',
                'kondisi_akhir' => $entry->kondisi_akhir,
                'approval_status' => $entry->approval_status,
                'escalated' => $entry->escalated_at !== null,
                'catatan_approval' => $entry->catatan_approval,
                'pic_approver_id' => $entry->pic_approver_id,
                'pic_name' => $entry->pic?->name,
                'approver_name' => $entry->approver?->name,
                'approver_signature_url' => $entry->approver_signature_url
                    ? route('p2h.signature', [$entry, 'approver'])
                    : null,
                'approved_at' => $entry->approved_at?->format('d/m/Y H:i'),
                'submitted_at' => $entry->submitted_at?->format('d/m/Y H:i'),
                'score' => $score,
                'tl_count' => $tlCount,
                'has_critical' => $hasCritical,
            ];
        });

        // Hitung stats untuk header summary
        $baseQuery = P2hUserEntry::whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'))
            ->when(! $user->isPrivileged(), fn ($q) => $q->where('pic_approver_id', $user->id));

        $stats = [
            'pending' => (clone $baseQuery)->where('approval_status', 'pending')->count(),
            'approved_today' => (clone $baseQuery)->where('approval_status', 'approved')->whereDate('approved_at', today())->count(),
            'rejected_today' => (clone $baseQuery)->where('approval_status', 'rejected')->whereDate('approved_at', today())->count(),
        ];

        return Inertia::render('p2h/approvals', [
            'entries' => $mapped,
            'filters' => $request->only(['status']),
            'canSeeAllDept' => $user->isPrivileged(),
            'stats' => $stats,
            // Approve massal khusus admin: jumlah pending yang bisa ikut disetujui sekaligus
            'bulkApprovable' => $user->hasRole('admin') ? $this->bulkApprovableQuery($user)->count() : null,
        ]);
    }

    public function detail(Request $request, P2hUserEntry $entry): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user->canApproveLv()
                && ($user->id === $entry->pic_approver_id || $user->isPrivileged()),
            403
        );

        $entry->load([
            'user:id,name,nik,jabatan,department',
            'session.unit:id,no_unit,jenis_unit,department',
            'answers.inspectionItem',
            'fuelLog',
            'pic:id,name,jabatan',
            'attachments',
        ]);

        $inspectionItems = HistoricalInspectionItems::fromEntries(collect([$entry]));

        $groupedAnswers = $inspectionItems->map(function ($item) use ($entry) {
            $answer = $entry->answers->firstWhere('inspection_item_id', $item->id);

            return [
                'inspection_item_id' => $item->id,
                'section' => $item->section,
                'nama_item' => $item->nama_item,
                'kode_bahaya' => $item->kode_bahaya,
                'kondisi' => $answer?->kondisi,
                'keterangan' => $answer?->keterangan,
            ];
        })->groupBy('section');

        $totalItems = $entry->answers->count();
        $layakCount = $entry->answers->where('kondisi', 'Layak')->count();
        $tlCount = $entry->answers->where('kondisi', 'Tidak Layak')->count();
        $score = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;

        return response()->json([
            'id' => $entry->id,
            'session_id' => $entry->p2h_session_id,
            'no_unit' => $entry->session->unit->no_unit ?? '-',
            'jenis_unit' => $entry->session->unit->jenis_unit ?? '-',
            'department' => $entry->session->unit->department ?? '-',
            'tanggal' => $entry->session->tanggal?->format('d/m/Y'),
            'shift' => $entry->shift,
            'lokasi_kerja' => $entry->lokasi_kerja,
            'km_awal' => $entry->km_awal,
            'hm_km_akhir' => $entry->hm_km_akhir,
            'driver_name' => $entry->user->name ?? '-',
            'driver_nik' => $entry->user->nik ?? '-',
            'driver_jabatan' => $entry->user->jabatan ?? '-',
            'kondisi_akhir' => $entry->kondisi_akhir,
            'justifikasi_kondisi' => $entry->justifikasi_kondisi,
            'paraf_url' => $entry->paraf_url ? route('p2h.signature', [$entry, 'submitter']) : null,
            'submitted_at' => $entry->submitted_at?->format('d/m/Y H:i'),
            'approval_status' => $entry->approval_status,
            'fuel_log' => $entry->fuelLog ? [
                'km_unit' => $entry->fuelLog->km_unit,
                'jumlah_liter' => $entry->fuelLog->jumlah_liter,
            ] : null,
            'score' => $score,
            'tl_count' => $tlCount,
            'grouped_answers' => $groupedAnswers,
            'attachments' => $entry->attachments
                ->where('inspection_item_id', null)
                ->map(fn ($a) => ['url' => route('p2h.attachment', $a)])
                ->values(),
        ]);
    }

    public function approve(Request $request, P2hUserEntry $entry): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canApproveLv(), 403);
        abort_if($user->id === $entry->user_id, 403, 'Tidak dapat menyetujui P2H milik sendiri.');
        abort_unless(
            $user->id === $entry->pic_approver_id || $user->isPrivileged(),
            403,
            'Anda bukan PIC untuk entry ini.'
        );

        $request->validate([
            'signature' => ['required', new ValidSignatureDataUrl],
            'catatan' => 'nullable|string|max:500',
        ]);

        $updated = $this->approveEntry($entry, $user, $request->string('signature')->toString(), $request->catatan ?: null);

        if (! $updated) {
            return redirect()->route('p2h.approvals')
                ->with('error', 'Entry ini sudah diproses oleh user lain.');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'P2H disetujui',
            'description' => "P2H unit {$entry->session->unit?->no_unit} oleh {$entry->user?->name} telah diverifikasi dan ditandatangani.",
        ]);

        return redirect()->route('p2h.approvals');
    }

    /**
     * Approve massal oleh admin untuk P2H LV yang menumpuk karena PIC tidak merespons.
     * Entry dengan item Critical (AA) Tidak Layak dan P2H milik admin sendiri dilewati:
     * keduanya tetap wajib direview satu per satu.
     */
    public function bulkApprove(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('admin'), 403);

        $request->validate([
            'signature' => ['required', new ValidSignatureDataUrl],
            'catatan' => 'nullable|string|max:500',
        ]);

        $signature = $request->string('signature')->toString();
        $catatan = $request->catatan ?: 'Disetujui massal oleh admin (PIC tidak merespons).';
        $pendingBefore = $this->lvPendingQuery()->count();
        $approved = 0;

        // chunkById aman walau approval_status berubah: paginasi berdasarkan id
        $this->bulkApprovableQuery($user)->chunkById(100, function ($entries) use ($user, $signature, $catatan, &$approved) {
            foreach ($entries as $entry) {
                if ($this->approveEntry($entry, $user, $signature, $catatan)) {
                    $approved++;
                }
            }
        });

        $skipped = max(0, $pendingBefore - $approved);

        activity('p2h')
            ->causedBy($user)
            ->withProperties(['approved' => $approved, 'skipped' => $skipped, 'catatan' => $catatan])
            ->log("Approve massal {$approved} P2H LV");

        Inertia::flash('toast', [
            'type' => $approved > 0 ? 'success' : 'warning',
            'message' => $approved > 0 ? "{$approved} P2H disetujui" : 'Tidak ada P2H yang disetujui',
            'description' => $skipped > 0
                ? "{$skipped} P2H dilewati (item Critical AA / milik sendiri) dan perlu direview satu per satu."
                : 'Semua P2H LV yang menunggu telah disetujui.',
        ]);

        return redirect()->route('p2h.approvals');
    }

    public function reject(Request $request, P2hUserEntry $entry): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canApproveLv(), 403);
        abort_if($user->id === $entry->user_id, 403, 'Tidak dapat menolak P2H milik sendiri.');
        abort_unless(
            $user->id === $entry->pic_approver_id || $user->isPrivileged(),
            403,
            'Anda bukan PIC untuk entry ini.'
        );

        $request->validate([
            'catatan' => 'required|string|max:500',
        ]);

        $catatan = $request->catatan;

        $updated = DB::transaction(function () use ($entry, $user, $catatan) {
            // lockForUpdate mencegah race condition double-reject
            $fresh = P2hUserEntry::lockForUpdate()->find($entry->id);

            if (! $fresh || $fresh->approval_status !== 'pending') {
                return false;
            }

            $fresh->update([
                'approval_status' => 'rejected',
                'approver_id' => $user->id,
                'approved_at' => now(),
                'catatan_approval' => $catatan,
            ]);

            $fresh->session->recomputeBestComplianceScore();

            return true;
        });

        if (! $updated) {
            return redirect()->route('p2h.approvals')
                ->with('error', 'Entry ini sudah diproses oleh user lain.');
        }

        $entry->refresh();
        $entry->load(['session.unit', 'user']);
        try {
            $entry->user?->notify(new LvP2hApprovalResult(
                session: $entry->session,
                entry: $entry,
                approver: $user,
                status: 'rejected',
            ));
        } catch (\Throwable $exception) {
            Log::warning('Notifikasi hasil penolakan P2H gagal dikirim.', [
                'entry_id' => $entry->id,
                'error' => $exception->getMessage(),
            ]);
        }
        cache()->forget("recent_notifications_user_{$entry->user_id}");

        $this->markEntryNotificationsRead($entry);
        PendingApprovalCache::forgetFor($entry);

        Inertia::flash('toast', [
            'type' => 'warning',
            'message' => 'P2H ditolak',
            'description' => "P2H unit {$entry->session->unit?->no_unit} oleh {$entry->user?->name} ditolak.",
        ]);

        return redirect()->route('p2h.approvals');
    }

    /** P2H LV yang masih menunggu approval. */
    private function lvPendingQuery(): Builder
    {
        return P2hUserEntry::query()
            ->where('approval_status', 'pending')
            ->whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'));
    }

    /** Entry pending yang boleh ikut approve massal: tanpa Critical (AA) TL & bukan milik sendiri. */
    private function bulkApprovableQuery(User $user): Builder
    {
        return $this->lvPendingQuery()
            ->where('user_id', '!=', $user->id)
            ->whereDoesntHave('answers', fn ($q) => $q
                ->where('kondisi', 'Tidak Layak')
                ->where('item_kode_bahaya', 'AA'));
    }

    /**
     * Setujui satu entry (dipakai approve satuan & massal). Mengembalikan false bila
     * entry sudah diproses user lain. Tanda tangan disimpan per entry agar file
     * setiap entry berdiri sendiri (aman saat entry/unit lain dihapus permanen).
     */
    private function approveEntry(P2hUserEntry $entry, User $user, string $signature, ?string $catatan): bool
    {
        $approverSignatureUrl = SignatureImage::store($signature, 'approver_');

        try {
            $updated = DB::transaction(function () use ($entry, $user, $approverSignatureUrl, $catatan) {
                // lockForUpdate mencegah race condition double-approval
                $fresh = P2hUserEntry::lockForUpdate()->find($entry->id);

                if (! $fresh || $fresh->approval_status !== 'pending') {
                    return false;
                }

                $fresh->update([
                    'approval_status' => 'approved',
                    'approver_id' => $user->id,
                    'approved_at' => now(),
                    'approver_signature_url' => $approverSignatureUrl,
                    'catatan_approval' => $catatan,
                ]);

                $fresh->session->recomputeBestComplianceScore();

                return true;
            });
        } catch (\Throwable $exception) {
            P2hFileStorage::delete($approverSignatureUrl);

            throw $exception;
        }

        if (! $updated) {
            P2hFileStorage::delete($approverSignatureUrl);

            return false;
        }

        $entry->refresh();
        $entry->load(['session.unit', 'user']);
        try {
            $entry->user?->notify(new LvP2hApprovalResult(
                session: $entry->session,
                entry: $entry,
                approver: $user,
                status: 'approved',
            ));
        } catch (\Throwable $exception) {
            Log::warning('Notifikasi hasil approval P2H gagal dikirim.', [
                'entry_id' => $entry->id,
                'error' => $exception->getMessage(),
            ]);
        }
        cache()->forget("recent_notifications_user_{$entry->user_id}");

        $this->markEntryNotificationsRead($entry);
        PendingApprovalCache::forgetFor($entry);

        return true;
    }

    /**
     * Permintaan approval (PIC) & eskalasi (admin) untuk entry ini sudah tidak
     * perlu ditindaklanjuti — tandai dibaca untuk semua penerimanya.
     */
    private function markEntryNotificationsRead(P2hUserEntry $entry): void
    {
        $notifications = DatabaseNotification::query()
            ->whereNull('read_at')
            ->whereIn('data->type', ['lv_approval_request', 'lv_approval_escalation'])
            // entry_id tersimpan sebagai angka di JSON; cocokkan dua bentuk agar lintas driver DB
            ->whereIn('data->entry_id', [$entry->id, (string) $entry->id]);

        $recipientIds = (clone $notifications)->distinct()->pluck('notifiable_id');
        $notifications->update(['read_at' => now()]);

        $recipientIds->each(fn ($id) => cache()->forget("recent_notifications_user_{$id}"));
    }
}
