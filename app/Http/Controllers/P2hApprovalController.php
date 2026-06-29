<?php

namespace App\Http\Controllers;

use App\Models\P2hInspectionItem;
use App\Models\P2hUserEntry;
use App\Notifications\LvP2hApprovalResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class P2hApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user->canViewApprovals(), 403);

        $query = P2hUserEntry::with([
            'user:id,name,nik,jabatan,department',
            'session.unit:id,no_unit,jenis_unit,department',
            'pic:id,name,jabatan',
            'approver:id,name',
            'answers.inspectionItem',
        ])
        ->whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'))
        ->when(
            // Staff/Sr.Staff murni hanya lihat yang mereka ditunjuk sebagai PIC
            $user->isStaffOnly(),
            fn ($q) => $q->where('pic_approver_id', $user->id)
        )
        ->when($request->status ?? 'pending', fn ($q, $s) => $q->where('approval_status', $s))
        ->latest('submitted_at');

        $entries = $query->paginate(20)->withQueryString();

        $mapped = $entries->through(function ($entry) {
            $totalItems  = $entry->answers->count();
            $layakCount  = $entry->answers->where('kondisi', 'Layak')->count();
            $tlCount     = $entry->answers->where('kondisi', 'Tidak Layak')->count();
            $score       = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;
            $hasCritical = $entry->answers->contains(fn ($a) =>
                $a->kondisi === 'Tidak Layak' && $a->inspectionItem?->kode_bahaya === 'AA'
            );

            return [
                'id'                    => $entry->id,
                'session_id'            => $entry->p2h_session_id,
                'no_unit'               => $entry->session->unit->no_unit ?? '-',
                'jenis_unit'            => $entry->session->unit->jenis_unit ?? '-',
                'department'            => $entry->session->unit->department ?? '-',
                'tanggal'               => $entry->session->tanggal?->format('d/m/Y'),
                'shift'                 => $entry->shift,
                'driver_name'           => $entry->user->name ?? '-',
                'driver_nik'            => $entry->user->nik ?? '-',
                'driver_jabatan'        => $entry->user->jabatan ?? '-',
                'kondisi_akhir'         => $entry->kondisi_akhir,
                'approval_status'       => $entry->approval_status,
                'catatan_approval'      => $entry->catatan_approval,
                'pic_approver_id'       => $entry->pic_approver_id,
                'pic_name'              => $entry->pic?->name,
                'approver_name'         => $entry->approver?->name,
                'approver_signature_url'=> $entry->approver_signature_url
                    ? Storage::disk('public')->url($entry->approver_signature_url)
                    : null,
                'approved_at'           => $entry->approved_at?->format('d/m/Y H:i'),
                'submitted_at'          => $entry->submitted_at?->format('d/m/Y H:i'),
                'score'                 => $score,
                'tl_count'              => $tlCount,
                'has_critical'          => $hasCritical,
            ];
        });

        // Hitung stats untuk header summary
        $baseQuery = P2hUserEntry::whereHas('session.unit', fn ($q) => $q->where('jenis_unit', 'Light Vehicle'))
            ->when($user->isStaffOnly(), fn ($q) => $q->where('pic_approver_id', $user->id));

        $stats = [
            'pending'           => (clone $baseQuery)->where('approval_status', 'pending')->count(),
            'approved_today'    => (clone $baseQuery)->where('approval_status', 'approved')->whereDate('approved_at', today())->count(),
            'rejected_today'    => (clone $baseQuery)->where('approval_status', 'rejected')->whereDate('approved_at', today())->count(),
        ];

        return Inertia::render('p2h/approvals', [
            'entries'       => $mapped,
            'filters'       => $request->only(['status']),
            'canSeeAllDept' => $user->isPrivileged(),
            'stats'         => $stats,
        ]);
    }

    public function detail(Request $request, P2hUserEntry $entry): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user->id === $entry->pic_approver_id || $user->isPrivileged(),
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

        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        $groupedAnswers = $inspectionItems->map(function ($item) use ($entry) {
            $answer = $entry->answers->firstWhere('inspection_item_id', $item->id);
            return [
                'inspection_item_id' => $item->id,
                'section'            => $item->section,
                'nama_item'          => $item->nama_item,
                'kode_bahaya'        => $item->kode_bahaya,
                'kondisi'            => $answer?->kondisi,
                'keterangan'         => $answer?->keterangan,
            ];
        })->groupBy('section');

        $totalItems  = $entry->answers->count();
        $layakCount  = $entry->answers->where('kondisi', 'Layak')->count();
        $tlCount     = $entry->answers->where('kondisi', 'Tidak Layak')->count();
        $score       = $totalItems > 0 ? round(($layakCount / $totalItems) * 100) : 0;

        return response()->json([
            'id'                   => $entry->id,
            'session_id'           => $entry->p2h_session_id,
            'no_unit'              => $entry->session->unit->no_unit ?? '-',
            'jenis_unit'           => $entry->session->unit->jenis_unit ?? '-',
            'department'           => $entry->session->unit->department ?? '-',
            'tanggal'              => $entry->session->tanggal?->format('d/m/Y'),
            'shift'                => $entry->shift,
            'lokasi_kerja'         => $entry->lokasi_kerja,
            'km_awal'              => $entry->km_awal,
            'hm_km_akhir'          => $entry->hm_km_akhir,
            'driver_name'          => $entry->user->name ?? '-',
            'driver_nik'           => $entry->user->nik ?? '-',
            'driver_jabatan'       => $entry->user->jabatan ?? '-',
            'kondisi_akhir'        => $entry->kondisi_akhir,
            'justifikasi_kondisi'  => $entry->justifikasi_kondisi,
            'paraf_url'            => $entry->paraf_url ? Storage::disk('public')->url($entry->paraf_url) : null,
            'submitted_at'         => $entry->submitted_at?->format('d/m/Y H:i'),
            'approval_status'      => $entry->approval_status,
            'fuel_log'             => $entry->fuelLog ? [
                'km_unit'      => $entry->fuelLog->km_unit,
                'jumlah_liter' => $entry->fuelLog->jumlah_liter,
            ] : null,
            'score'                => $score,
            'tl_count'             => $tlCount,
            'grouped_answers'      => $groupedAnswers,
            'attachments'          => $entry->attachments
                ->where('inspection_item_id', null)
                ->map(fn($a) => ['url' => Storage::disk('public')->url($a->path)])
                ->values(),
        ]);
    }

    public function approve(Request $request, P2hUserEntry $entry): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canViewApprovals(), 403);
        abort_unless(
            $user->id === $entry->pic_approver_id || $user->isPrivileged(),
            403,
            'Anda bukan PIC untuk entry ini.'
        );

        $request->validate([
            'signature' => 'required|string',
            'catatan'   => 'nullable|string|max:500',
        ]);

        // Simpan tanda tangan approver sebelum masuk transaction
        $approverSignatureUrl = null;
        $base64  = preg_replace('/^data:image\/\w+;base64,/', '', $request->signature);
        $imgData = base64_decode($base64, strict: true);

        if ($imgData !== false) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime  = $finfo->buffer($imgData);
            if (in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
                $filename = 'signatures/approver_' . Str::uuid() . '.png';
                Storage::disk('public')->put($filename, $imgData);
                $approverSignatureUrl = $filename;
            }
        }

        $catatan = $request->catatan ?: null;

        $updated = DB::transaction(function () use ($entry, $user, $approverSignatureUrl, $catatan) {
            // lockForUpdate mencegah race condition double-approval
            $fresh = P2hUserEntry::lockForUpdate()->find($entry->id);

            if ($fresh->approval_status !== 'pending') {
                return false;
            }

            $fresh->update([
                'approval_status'        => 'approved',
                'approver_id'            => $user->id,
                'approved_at'            => now(),
                'approver_signature_url' => $approverSignatureUrl,
                'catatan_approval'       => $catatan,
            ]);

            return true;
        });

        if (! $updated) {
            return redirect()->route('p2h.approvals')
                ->with('error', 'Entry ini sudah diproses oleh user lain.');
        }

        $entry->refresh();
        $entry->load(['session.unit', 'user']);
        $entry->user?->notify(new LvP2hApprovalResult(
            session: $entry->session,
            entry: $entry,
            approver: $user,
            status: 'approved',
        ));

        // Tandai notifikasi approval request terkait sebagai sudah dibaca
        $user->notifications()
            ->whereNull('read_at')
            ->where('data->type', 'lv_approval_request')
            ->where('data->entry_id', (string) $entry->id)
            ->update(['read_at' => now()]);
        cache()->forget("recent_notifications_user_{$user->id}");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'P2H disetujui',
            'description' => "P2H unit {$entry->session->unit?->no_unit} oleh {$entry->user?->name} telah diverifikasi dan ditandatangani.",
        ]);

        return redirect()->route('p2h.approvals');
    }

    public function reject(Request $request, P2hUserEntry $entry): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canViewApprovals(), 403);
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

            if ($fresh->approval_status !== 'pending') {
                return false;
            }

            $fresh->update([
                'approval_status'  => 'rejected',
                'approver_id'      => $user->id,
                'approved_at'      => now(),
                'catatan_approval' => $catatan,
            ]);

            return true;
        });

        if (! $updated) {
            return redirect()->route('p2h.approvals')
                ->with('error', 'Entry ini sudah diproses oleh user lain.');
        }

        $entry->refresh();
        $entry->load(['session.unit', 'user']);
        $entry->user?->notify(new LvP2hApprovalResult(
            session: $entry->session,
            entry: $entry,
            approver: $user,
            status: 'rejected',
        ));

        // Tandai notifikasi approval request terkait sebagai sudah dibaca
        $user->notifications()
            ->whereNull('read_at')
            ->where('data->type', 'lv_approval_request')
            ->where('data->entry_id', (string) $entry->id)
            ->update(['read_at' => now()]);
        cache()->forget("recent_notifications_user_{$user->id}");

        Inertia::flash('toast', [
            'type'        => 'warning',
            'message'     => 'P2H ditolak',
            'description' => "P2H unit {$entry->session->unit?->no_unit} oleh {$entry->user?->name} ditolak.",
        ]);

        return redirect()->route('p2h.approvals');
    }
}
