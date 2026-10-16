<?php

namespace App\Http\Controllers;

use App\Ai\Agents\P2hRepairSuggestionAgent;
use App\Enums\FindingStatus;
use App\Http\Controllers\Concerns\SortsTable;
use App\Http\Requests\BatchUpdateP2hFindingRequest;
use App\Http\Requests\UpdateP2hFindingRequest;
use App\Models\P2hFinding;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\FindingAssigned;
use App\Support\AiText;
use App\Support\P2hFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class P2hFindingController extends Controller
{
    use SortsTable;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:unresolved,overdue,open,progress,closed,all'],
            'site_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'unresolved';
        $user = $request->user();
        $canManage = $user->can('manage', P2hFinding::class);
        // Driver hanya melihat temuan yang ditugaskan kepadanya
        $scope = fn ($q) => $q->active()->when(! $canManage, fn ($q) => $q->where('pic_user_id', $user->id));

        // Pastikan tidak ada item Tidak Layak yang terlewat menjadi temuan
        P2hFinding::syncRecent();

        $query = P2hFinding::query()
            ->where($scope)
            ->with(['unit:id,no_unit,jenis_unit,no_lambung', 'pic:id,name', 'closer:id,name', 'entry:id,kondisi_akhir,justifikasi_kondisi'])
            ->when($status === 'unresolved', fn ($q) => $q->where('status', '!=', FindingStatus::Closed->value))
            ->when($status === 'overdue', fn ($q) => $q->unresolved()->whereDate('target_selesai', '<', today()))
            ->when(in_array($status, ['open', 'progress', 'closed'], true), fn ($q) => $q->where('status', $status))
            ->when($filters['site_id'] ?? null, fn ($q, $siteId) => $q->where('site_id', $siteId))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('item_nama', 'like', "%{$search}%")
                    ->orWhereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$search}%"));
            }));

        $sort = $this->applySort($query, $request, [
            'tanggal_temuan' => 'tanggal_temuan',
            'unit' => fn ($q, $dir) => $q->orderBy(
                Unit::withTrashed()->select('no_unit')->whereColumn('units.id', 'p2h_findings.unit_id'),
                $dir,
            ),
            'item_nama' => 'item_nama',
            'tindakan_perbaikan' => 'tindakan_perbaikan',
            'pic' => fn ($q, $dir) => $q->orderBy(
                User::select('name')->whereColumn('users.id', 'p2h_findings.pic_user_id'),
                $dir,
            ),
            'target_selesai' => 'target_selesai',
            'status' => 'status',
        ], 'unit');

        $findings = $query->paginate(20)->withQueryString();

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
                'berulang' => $f->recurringCount($recurrence),
                'closed_at' => $f->closed_at?->format('Y-m-d H:i'),
                'closed_by' => $f->closer?->name,
                'catatan_penutupan' => $f->catatan_penutupan,
                'foto_url' => $f->foto_penutupan ? route('p2h.findings.photo', $f) : null,
                'keputusan_unit' => $f->entry?->kondisi_akhir,
                'alasan_keputusan' => filled($f->entry?->justifikasi_kondisi) ? trim($f->entry->justifikasi_kondisi) : null,
                'jumlah_laporan' => $f->jumlah_laporan,
                'terakhir_dilaporkan' => $f->terakhir_dilaporkan?->toDateString(),
            ]),
            'counts' => [
                'open' => P2hFinding::where($scope)->where('status', FindingStatus::Open->value)->count(),
                'progress' => P2hFinding::where($scope)->where('status', FindingStatus::Progress->value)->count(),
                'overdue' => P2hFinding::where($scope)->unresolved()->whereDate('target_selesai', '<', today())->count(),
                'critical' => P2hFinding::where($scope)->unresolved()->where('kode_bahaya', 'AA')->count(),
                'due_today' => P2hFinding::where($scope)->unresolved()->whereDate('target_selesai', today())->count(),
                'closed' => P2hFinding::where($scope)->where('status', FindingStatus::Closed->value)->count(),
                'all' => P2hFinding::where($scope)->count(),
                // Rata-rata umur temuan yang belum selesai, dalam hari (Temuan-Desktop.png)
                'avg_age_days' => ($dates = P2hFinding::where($scope)->unresolved()->pluck('tanggal_temuan'))->isEmpty()
                    ? null
                    : round($dates->avg(fn ($d) => $d->diffInDays(today())), 1),
            ],
            'picOptions' => $canManage
                ? User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'manager', 'driver']))->orderBy('name')->get(['id', 'name'])
                : [],
            'sites' => $canManage ? Site::where('status', 'active')->orderBy('name')->get(['id', 'name']) : [],
            'filters' => [
                'status' => $status,
                'site_id' => $filters['site_id'] ?? null,
                'search' => $filters['search'] ?? null,
                ...$request->only(['sort', 'dir']),
            ],
            'sort' => $sort,
            'canManage' => $canManage,
            'aiEnabled' => AiText::enabled(),
            'recurringWindowDays' => config('p2h.findings.recurring_window_days'),
        ]);
    }

    public function update(UpdateP2hFindingRequest $request, P2hFinding $finding): RedirectResponse
    {
        $data = $request->safe()->except('foto_penutupan');

        // PIC & target hanya diatur admin/manager; driver (PIC) mengisi progress saja
        if (! $request->user()->can('manage', P2hFinding::class)) {
            unset($data['pic_user_id'], $data['target_selesai']);
        }

        $isClosing = $data['status'] === FindingStatus::Closed->value;
        $previousPic = $finding->pic_user_id;
        $targetChanged = array_key_exists('target_selesai', $data)
            && ($data['target_selesai'] ?? null) !== $finding->target_selesai?->toDateString();
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

    /** Update/close beberapa temuan sekaligus dengan perubahan yang sama. */
    public function batchUpdate(BatchUpdateP2hFindingRequest $request): RedirectResponse
    {
        $user = $request->user();
        $changes = collect($request->validated())
            ->only(['status', 'pic_user_id', 'target_selesai', 'tindakan_perbaikan'])
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->all();
        $isClosing = ($changes['status'] ?? null) === FindingStatus::Closed->value;

        // Satu foto bukti untuk semua temuan; disalin per temuan agar penggantian foto
        // pada satu temuan tidak menghapus bukti temuan lain
        $sharedPhoto = $isClosing && $request->hasFile('foto_penutupan')
            ? $request->file('foto_penutupan')->store('p2h-findings/batch', 'local')
            : null;

        $findings = P2hFinding::with('unit:id,no_unit')->whereIn('id', $request->validated('ids'))->get();

        foreach ($findings as $finding) {
            $previousPic = $finding->pic_user_id;
            $data = $changes;

            if ($isClosing) {
                $data['catatan_penutupan'] = $request->validated('catatan_penutupan') ?? $finding->catatan_penutupan;
                $data['closed_at'] = $finding->closed_at ?? now();
                $data['closed_by'] = $finding->closed_by ?? $user->id;

                if ($sharedPhoto && $finding->status !== FindingStatus::Closed) {
                    $copy = "p2h-findings/{$finding->id}/".basename($sharedPhoto);
                    Storage::disk('local')->copy($sharedPhoto, $copy);
                    $oldPhoto = $finding->foto_penutupan;
                    $data['foto_penutupan'] = $copy;
                }
            } elseif (isset($data['status'])) {
                $data['closed_at'] = null;
                $data['closed_by'] = null;
            }

            if (array_key_exists('target_selesai', $data) && $data['target_selesai'] !== $finding->target_selesai?->toDateString()) {
                $data['overdue_notified_at'] = null;
            }

            $finding->update($data);

            if (isset($oldPhoto)) {
                P2hFileStorage::delete($oldPhoto);
                unset($oldPhoto);
            }

            if ($finding->pic_user_id && $finding->pic_user_id !== $previousPic && $finding->pic_user_id !== $user->id) {
                $finding->load('pic');
                $finding->pic->notify(new FindingAssigned($finding, $user->name));
            }
        }

        if ($sharedPhoto) {
            Storage::disk('local')->delete($sharedPhoto);
        }

        activity('p2h')
            ->causedBy($user)
            ->withProperties(['finding_ids' => $findings->pluck('id'), 'changes' => array_keys($changes)])
            ->log("Update massal {$findings->count()} temuan P2H");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$findings->count()} temuan diperbarui",
            'description' => isset($changes['status'])
                ? 'Status diubah menjadi '.FindingStatus::from($changes['status'])->label().'.'
                : 'Perubahan diterapkan ke semua temuan yang dipilih.',
        ]);

        return back();
    }

    public function photo(P2hFinding $finding): StreamedResponse
    {
        $this->authorize('view', $finding);
        abort_unless($finding->foto_penutupan, 404);

        return P2hFileStorage::response($finding->foto_penutupan);
    }

    public function suggest(P2hFinding $finding): JsonResponse
    {
        $this->authorize('update', $finding);

        if (! AiText::enabled()) {
            return response()->json(['message' => 'AI belum dikonfigurasi (GEMINI_API_KEY kosong).'], 422);
        }

        $finding->load('unit:id,no_unit,jenis_unit');

        // Riwayat perbaikan serupa yang sudah closed sebagai referensi AI
        $history = P2hFinding::query()
            ->active()
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

        $recurrence = P2hFinding::recurrenceCounts(today())
            ->get(P2hFinding::recurrenceKey($finding->unit_id, $finding->item_nama), 1);

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
