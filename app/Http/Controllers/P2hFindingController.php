<?php

namespace App\Http\Controllers;

use App\Ai\Agents\P2hRepairSuggestionAgent;
use App\Enums\FindingStatus;
use App\Http\Requests\UpdateP2hFindingRequest;
use App\Models\P2hFinding;
use App\Models\Site;
use App\Models\User;
use App\Notifications\FindingAssigned;
use App\Support\AiText;
use App\Support\P2hFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class P2hFindingController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:unresolved,overdue,open,progress,closed,all'],
            'site_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'unresolved';

        $findings = P2hFinding::query()
            ->whereHas('entry')
            ->with(['unit:id,no_unit,jenis_unit,no_lambung', 'pic:id,name', 'closer:id,name'])
            ->when($status === 'unresolved', fn ($q) => $q->where('status', '!=', FindingStatus::Closed->value))
            ->when($status === 'overdue', fn ($q) => $q->unresolved()->whereDate('target_selesai', '<', today()))
            ->when(in_array($status, ['open', 'progress', 'closed'], true), fn ($q) => $q->where('status', $status))
            ->when($filters['site_id'] ?? null, fn ($q, $siteId) => $q->where('site_id', $siteId))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('item_nama', 'like', "%{$search}%")
                    ->orWhereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$search}%"));
            }))
            ->orderByDesc('tanggal_temuan')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        $recurrence = P2hFinding::recurrenceCounts(today());

        return Inertia::render('p2h/findings', [
            'findings' => $findings->through(fn (P2hFinding $f) => [
                'id' => $f->id,
                'tanggal_temuan' => $f->tanggal_temuan->toDateString(),
                'no_unit' => $f->unit?->no_unit,
                'jenis_unit' => $f->unit?->jenis_unit,
                'item_nama' => $f->item_nama,
                'kode_bahaya' => $f->kode_bahaya,
                'keterangan' => $f->keterangan,
                'tindakan_perbaikan' => $f->tindakan_perbaikan,
                'pic_user_id' => $f->pic_user_id,
                'pic_name' => $f->pic?->name,
                'target_selesai' => $f->target_selesai?->toDateString(),
                'status' => $f->status->value,
                'overdue' => $f->isOverdue(),
                'berulang' => (fn (int $n) => P2hFinding::isRecurringCount($n) ? $n : null)(
                    $recurrence->get($f->unit_id.'|'.$f->item_nama, 0)
                ),
                'closed_at' => $f->closed_at?->format('Y-m-d H:i'),
                'closed_by' => $f->closer?->name,
                'catatan_penutupan' => $f->catatan_penutupan,
                'foto_url' => $f->foto_penutupan ? route('p2h.findings.photo', $f) : null,
            ]),
            'counts' => [
                'open' => P2hFinding::whereHas('entry')->where('status', FindingStatus::Open->value)->count(),
                'progress' => P2hFinding::whereHas('entry')->where('status', FindingStatus::Progress->value)->count(),
                'overdue' => P2hFinding::unresolved()->whereDate('target_selesai', '<', today())->count(),
            ],
            'picOptions' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'manager', 'driver']))
                ->orderBy('name')
                ->get(['id', 'name']),
            'sites' => Site::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'filters' => ['status' => $status, 'site_id' => $filters['site_id'] ?? null, 'search' => $filters['search'] ?? null],
            'aiEnabled' => AiText::enabled(),
            'recurringWindowDays' => config('p2h.findings.recurring_window_days'),
        ]);
    }

    public function update(UpdateP2hFindingRequest $request, P2hFinding $finding): RedirectResponse
    {
        $data = $request->safe()->except('foto_penutupan');
        $isClosing = $data['status'] === FindingStatus::Closed->value;
        $previousPic = $finding->pic_user_id;
        $targetChanged = ($data['target_selesai'] ?? null) !== $finding->target_selesai?->toDateString();
        $oldPhoto = null;

        if ($request->hasFile('foto_penutupan')) {
            $path = $request->file('foto_penutupan')->store("p2h-findings/{$finding->id}", 'local');
            abort_if($path === false, 500, 'Foto bukti perbaikan gagal disimpan.');
            $oldPhoto = $finding->foto_penutupan;
            $data['foto_penutupan'] = $path;
        }

        $finding->update([
            ...$data,
            'closed_at' => $isClosing ? ($finding->closed_at ?? now()) : null,
            'closed_by' => $isClosing ? ($finding->closed_by ?? $request->user()->id) : null,
            // Target berubah → pengingat overdue boleh dikirim lagi
            'overdue_notified_at' => $targetChanged ? null : $finding->overdue_notified_at,
        ]);

        if ($oldPhoto) {
            P2hFileStorage::delete($oldPhoto);
        }

        // PIC baru (bukan diri sendiri) mendapat notifikasi penugasan
        if ($finding->pic_user_id && $finding->pic_user_id !== $previousPic && $finding->pic_user_id !== $request->user()->id) {
            $finding->load(['unit:id,no_unit', 'pic']);
            $finding->pic->notify(new FindingAssigned($finding, $request->user()->name));
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Temuan diperbarui',
            'description' => "{$finding->item_nama} - status ".FindingStatus::from($data['status'])->label().'.',
        ]);

        return back();
    }

    public function photo(P2hFinding $finding): StreamedResponse
    {
        abort_unless($finding->foto_penutupan, 404);

        return P2hFileStorage::response($finding->foto_penutupan);
    }

    public function suggest(P2hFinding $finding): JsonResponse
    {
        if (! AiText::enabled()) {
            return response()->json(['message' => 'AI belum dikonfigurasi (GEMINI_API_KEY kosong).'], 422);
        }

        $finding->load('unit:id,no_unit,jenis_unit');

        // Riwayat perbaikan serupa yang sudah closed sebagai referensi AI
        $history = P2hFinding::query()
            ->where('item_nama', $finding->item_nama)
            ->where('status', FindingStatus::Closed->value)
            ->whereNotNull('tindakan_perbaikan')
            ->whereKeyNot($finding->id)
            ->latest('closed_at')
            ->limit(5)
            ->get(['unit_id', 'keterangan', 'tindakan_perbaikan', 'catatan_penutupan'])
            ->map(fn (P2hFinding $f) => [
                'unit_sama' => $f->unit_id === $finding->unit_id,
                'keterangan' => $f->keterangan,
                'tindakan' => $f->tindakan_perbaikan,
                'hasil' => $f->catatan_penutupan,
            ]);

        $recurrence = P2hFinding::recurrenceCounts(today())->get($finding->unit_id.'|'.$finding->item_nama, 1);

        $text = AiText::generate(new P2hRepairSuggestionAgent, json_encode([
            'jenis_unit' => $finding->unit?->jenis_unit,
            'item' => $finding->item_nama,
            'kode_bahaya' => $finding->kode_bahaya,
            'keterangan_temuan' => $finding->keterangan,
            'kemunculan_30_hari' => $recurrence,
            'riwayat_perbaikan_serupa' => $history,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        if ($text === null) {
            return response()->json(['message' => 'AI sedang tidak tersedia. Coba lagi nanti.'], 503);
        }

        return response()->json(['suggestion' => $text]);
    }
}
