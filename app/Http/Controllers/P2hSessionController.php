<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreP2hRequest;
use App\Models\P2hAttachment;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFuelLog;
use App\Models\P2hInspectionItem;
use App\Models\P2hServiceInfo;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\CriticalItemAlert;
use App\Notifications\LvP2hApprovalRequest;
use App\Support\HistoricalInspectionItems;
use App\Support\P2hFileStorage;
use App\Support\SignatureImage;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class P2hSessionController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to' => 'nullable|date_format:Y-m-d',
            'jenis_unit' => 'nullable|in:Bus,Light Vehicle',
            'hasil' => 'nullable|in:ada_tl,semua_layak',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $user = $request->user();

        $query = P2hSession::with(['unit', 'userEntries.answers'])
            ->when($request->date_from, fn ($q) => $q->whereDate('tanggal', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('tanggal', '<=', $request->date_to))
            ->when($request->no_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$request->no_unit}%")))
            ->when($request->jenis_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $request->jenis_unit)))
            ->when($request->hasil === 'ada_tl', fn ($q) => $q->whereHas('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->hasil === 'semua_layak', fn ($q) => $q->whereDoesntHave('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->user_id, fn ($q) => $q->whereHas('userEntries', fn ($e) => $e->where('user_id', $request->user_id)));

        if ($user->isStaffOnly()) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id)
                ->orWhere('pic_approver_id', $user->id));
        } elseif ($user->hasRole('driver')) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id));
        }
        // Admin/manager: tidak ada filter tambahan → lihat semua

        $sessions = $query->latest()->paginate(15)->withQueryString();

        $mapped = $sessions->through(function ($session) {
            return [
                'id' => $session->id,
                'tanggal' => $session->tanggal->format('Y-m-d'),
                'no_unit' => $session->unit->no_unit,
                'jenis_unit' => $session->unit->jenis_unit,
                'slot_terisi' => $session->userEntries->count(),
                'total_tl' => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                'status' => $session->status,
            ];
        });

        // Kirim daftar user (hanya untuk admin/manager) untuk filter driver
        $allUsers = $user->hasAnyRole(['admin', 'manager'])
            ? User::role('driver')->orderBy('name')->get(['id', 'name'])
            : collect();

        return Inertia::render('p2h/index', [
            'sessions' => $mapped,
            'filters' => $request->only(['date_from', 'date_to', 'no_unit', 'jenis_unit', 'hasil', 'user_id']),
            'allUsers' => $allUsers,
        ]);
    }

    public function create(): Response
    {
        $user = auth()->user();

        $assignedUnits = $user->units()->active()->orderBy('no_unit')->get(['units.id', 'no_unit', 'jenis_unit', 'units.department']);

        if ($user->isPrivileged()) {
            $units = Unit::active()->orderBy('no_unit')->get(['id', 'no_unit', 'jenis_unit', 'department']);
        } elseif ($assignedUnits->isNotEmpty()) {
            $units = $assignedUnits;
        } elseif ($user->site_id !== null || $user->jenis_unit !== null) {
            $units = Unit::active()
                ->when($user->jenis_unit, fn ($q) => $q->where('jenis_unit', $user->jenis_unit))
                ->when($user->site_id, fn ($q) => $q->where('site_id', $user->site_id))
                ->orderBy('no_unit')
                ->get(['id', 'no_unit', 'jenis_unit', 'department']);
        } else {
            $units = collect();
        }
        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        $picJabatanMap = ['Non Staff' => 'Staff', 'Staff' => 'Sr.Staff'];
        $picJabatan = $picJabatanMap[$user->jabatan] ?? null;

        $staffUsers = $picJabatan
            ? User::role('driver')
                ->where('jabatan', $picJabatan)
                ->when(! $user->isPrivileged() && $user->site_id, fn ($q) => $q->where('site_id', $user->site_id))
                ->orderBy('name')
                ->get(['id', 'name', 'jabatan', 'department'])
            : collect();

        return Inertia::render('p2h/form', [
            'units' => $units,
            'inspectionItems' => $inspectionItems,
            'staffUsers' => $staffUsers,
            'sites' => Site::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function checkSlot(Request $request): JsonResponse
    {
        $request->validate(['unit_id' => 'required|integer']);

        $unit = Unit::findOrFail($request->integer('unit_id'));
        abort_unless($request->user()->canAccessP2hUnit($unit), 403);

        $session = P2hSession::where('unit_id', $request->unit_id)
            ->whereDate('tanggal', today())
            ->first();

        $slotTerisi = $session ? $session->userEntries()->count() : 0;
        $nextSlot = $session
            ? ((int) $session->userEntries()->withTrashed()->max('user_slot')) + 1
            : 1;

        $lastEntry = P2hUserEntry::whereHas('session', fn ($q) => $q->where('unit_id', $request->unit_id))
            ->operational()
            ->whereNotNull('hm_km_akhir')
            ->latest('id')
            ->first();

        return response()->json([
            'session_id' => $session?->id,
            'slot_terisi' => $slotTerisi,
            'slot_tersedia' => true,
            'next_slot' => $nextSlot,
            'last_hm_km_akhir' => $lastEntry?->hm_km_akhir,
        ]);
    }

    public function store(StoreP2hRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        // Resolve atau buat sesi di luar transaksi agar MySQL error (duplicate key)
        // tidak membunuh transaksi utama yang menyimpan entry.
        // withTrashed() penting: jika sesi pernah soft-deleted, unique constraint MySQL
        // tetap memblokir INSERT sehingga kita harus restore, bukan membuat baru.
        $session = P2hSession::withTrashed()
            ->where('unit_id', $data['unit_id'])
            ->whereDate('tanggal', today())
            ->first();

        if (! $session) {
            try {
                $session = P2hSession::create([
                    'unit_id' => $data['unit_id'],
                    'tanggal' => today(),
                    'status' => 'open',
                    'created_by' => $user->id,
                    'job_site' => $data['job_site'] ?? null,
                ]);
            } catch (QueryException $e) {
                if ($e->getCode() !== '23000') {
                    throw $e;
                }
                // Race condition: sesi sudah dibuat request lain, ambil termasuk soft-deleted
                $session = P2hSession::withTrashed()
                    ->where('unit_id', $data['unit_id'])
                    ->whereDate('tanggal', today())
                    ->firstOrFail();
            }
        }

        // Jika sesi pernah di-soft-delete, restore agar bisa digunakan kembali
        if ($session->trashed()) {
            $session->restore();
            $session->update(['status' => 'open']);
        }

        $storedPaths = [];
        $createdEntry = null;
        $criticalTL = collect();
        $inspectionItems = P2hInspectionItem::whereIn(
            'id',
            collect($data['answers'])->pluck('inspection_item_id')
        )->get()->keyBy('id');

        try {
            DB::transaction(function () use ($data, $user, $session, $request, $inspectionItems, &$storedPaths, &$createdEntry, &$criticalTL) {

                // Lock baris sesi agar penghitungan slot antar submit bersamaan tidak balapan
                $lockedSession = P2hSession::whereKey($session->id)->lockForUpdate()->first();
                $isFirstActiveEntry = ! $lockedSession->userEntries()->exists();
                $nextSlot = ((int) $lockedSession->userEntries()->withTrashed()->max('user_slot')) + 1;

                // Simpan signature
                $parafUrl = null;
                if (! empty($data['paraf'])) {
                    $parafUrl = SignatureImage::store($data['paraf']);
                    $storedPaths[] = $parafUrl;
                }

                // Tentukan apakah entry ini perlu approval: LV + user adalah Non Staff
                $unit = Unit::withTrashed()->find($data['unit_id']);
                $needsApproval = $unit?->jenis_unit === 'Light Vehicle' && $user->needsLvApproval();

                // Buat user entry
                $entry = P2hUserEntry::create([
                    'p2h_session_id' => $session->id,
                    'user_id' => $user->id,
                    'user_slot' => $nextSlot,
                    'lokasi_kerja' => $data['lokasi_kerja'] ?? null,
                    'km_awal' => $data['km_awal'] ?? null,
                    'hm_km_akhir' => $data['hm_km_akhir'] ?? null,
                    'shift' => $data['shift'],
                    'paraf_url' => $parafUrl,
                    'submitted_at' => now(),
                    'kondisi_akhir' => $data['kondisi_akhir'],
                    'justifikasi_kondisi' => $data['justifikasi_kondisi'] ?? null,
                    'approval_status' => $needsApproval ? 'pending' : null,
                    'pic_approver_id' => $needsApproval ? ($data['pic_approver_id']) : null,
                ]);
                $createdEntry = $entry;

                // Simpan jawaban checklist
                foreach ($data['answers'] as $answer) {
                    $item = $inspectionItems->get($answer['inspection_item_id']);
                    P2hChecklistAnswer::create([
                        'p2h_user_entry_id' => $entry->id,
                        'inspection_item_id' => $answer['inspection_item_id'],
                        'kondisi' => $answer['kondisi'],
                        'keterangan' => $answer['keterangan'] ?? null,
                        'item_nama' => $item?->nama_item,
                        'item_section' => $item?->section,
                        'item_kode_bahaya' => $item?->kode_bahaya,
                        'item_urutan' => $item?->urutan,
                    ]);
                }

                // Refresh service info saat sesi aktif dimulai kembali setelah seluruh entry dihapus.
                if ($isFirstActiveEntry && ! empty($data['service_info'])) {
                    P2hServiceInfo::updateOrCreate(
                        ['p2h_session_id' => $session->id],
                        $data['service_info'],
                    );
                }

                // Simpan fuel log
                if (! empty($data['fuel_log'])) {
                    P2hFuelLog::create(array_merge(
                        ['p2h_user_entry_id' => $entry->id],
                        $data['fuel_log']
                    ));
                }

                // Simpan attachment utama form (wajib)
                foreach ($request->file('attachments', []) as $file) {
                    $path = $file->store("p2h-attachments/{$entry->id}", 'local');

                    if ($path === false) {
                        throw new \RuntimeException('Lampiran P2H gagal disimpan.');
                    }

                    $storedPaths[] = $path;
                    P2hAttachment::create([
                        'p2h_user_entry_id' => $entry->id,
                        'inspection_item_id' => null,
                        'path' => $path,
                    ]);
                }

                // Simpan attachment per item checklist (opsional)
                foreach ($request->file('item_attachments', []) as $itemId => $files) {
                    foreach ((array) $files as $file) {
                        $path = $file->store("p2h-attachments/{$entry->id}/items/{$itemId}", 'local');

                        if ($path === false) {
                            throw new \RuntimeException('Lampiran checklist gagal disimpan.');
                        }

                        $storedPaths[] = $path;
                        P2hAttachment::create([
                            'p2h_user_entry_id' => $entry->id,
                            'inspection_item_id' => (int) $itemId,
                            'path' => $path,
                        ]);
                    }
                }

                // Scope perhitungan memastikan entry pending/rejected tidak ikut score.
                $session->recomputeBestComplianceScore();

                // Cek item kode_bahaya AA + Tidak Layak → notifikasi admin
                $criticalTL = $entry->answers()
                    ->with('inspectionItem')
                    ->where('kondisi', 'Tidak Layak')
                    ->whereHas('inspectionItem', fn ($q) => $q->where('kode_bahaya', 'AA'))
                    ->get();

            });
        } catch (\Throwable $exception) {
            P2hFileStorage::delete($storedPaths);

            throw $exception;
        }

        try {
            if ($criticalTL->isNotEmpty()) {
                $alertKey = "critical_alert_sent_unit_{$session->unit_id}_".today()->toDateString();
                if (cache()->add($alertKey, true, now()->endOfDay())) {
                    foreach (User::role('admin')->get() as $admin) {
                        $admin->notify(new CriticalItemAlert($session, $createdEntry, $criticalTL));
                    }
                }
            }

            if ($createdEntry?->approval_status === 'pending' && $createdEntry->pic_approver_id) {
                $pic = User::find($createdEntry->pic_approver_id);
                $pic?->notify(new LvP2hApprovalRequest($session, $createdEntry, $user));
                if ($pic) {
                    cache()->forget("recent_notifications_user_{$pic->id}");
                    cache()->forget("pending_approvals_user_{$pic->id}");
                }
            }
        } catch (\Throwable $exception) {
            Log::warning('Notifikasi P2H gagal dikirim setelah data tersimpan.', [
                'entry_id' => $createdEntry?->id,
                'error' => $exception->getMessage(),
            ]);
        }

        $session = P2hSession::where('unit_id', $data['unit_id'])
            ->whereDate('tanggal', today())
            ->with('unit')
            ->first();

        $slotTerisi = $session->userEntries()->count();
        $hasCritical = $session->userEntries()
            ->with('answers.inspectionItem')
            ->get()
            ->flatMap(fn ($e) => $e->answers)
            ->where('kondisi', 'Tidak Layak')
            ->filter(fn ($a) => $a->inspectionItem?->kode_bahaya === 'AA')
            ->isNotEmpty();

        // Cek apakah entry ini pending approval
        $latestEntry = $session->userEntries()->with('pic')->latest()->first();
        $isPendingApproval = $latestEntry?->approval_status === 'pending';

        if ($hasCritical) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'P2H disimpan — Ada item Critical TL!',
                'description' => "Pengisian ke-{$slotTerisi} untuk unit {$session->unit->no_unit}. Terdapat item kode bahaya AA (Stop) yang tidak layak. Admin telah diberitahu.",
            ]);
        } elseif ($isPendingApproval) {
            $picName = $latestEntry?->pic?->name ?? 'PIC yang dipilih';
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => 'P2H disubmit — Menunggu Verifikasi',
                'description' => "P2H unit {$session->unit->no_unit} menunggu persetujuan dari {$picName}.",
            ]);
        } else {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'P2H berhasil disimpan',
                'description' => "Pengisian ke-{$slotTerisi} untuk unit {$session->unit->no_unit}.",
            ]);
        }

        return redirect()->route('p2h.index');
    }

    public function destroy(P2hSession $session): RedirectResponse
    {
        $this->authorize('delete', $session);

        activity('p2h')
            ->causedBy(auth()->user())
            ->performedOn($session)
            ->withProperties([
                'unit' => $session->unit?->no_unit,
                'tanggal' => $session->tanggal?->toDateString(),
            ])
            ->log("Menghapus sesi P2H unit {$session->unit?->no_unit} tanggal {$session->tanggal?->toDateString()}");

        $session->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Sesi P2H berhasil dihapus',
        ]);

        return redirect()->route('p2h.index');
    }

    public function destroyEntry(P2hSession $session, P2hUserEntry $entry): RedirectResponse
    {
        $this->authorize('deleteEntry', $session);
        abort_if($entry->p2h_session_id !== $session->id, 404);

        $sessionDeleted = false;

        DB::transaction(function () use ($session, $entry, &$sessionDeleted) {
            $entry->delete();

            if ($session->userEntries()->count() === 0) {
                $session->delete();
                $sessionDeleted = true;
            } else {
                $session->recomputeBestComplianceScore();
            }
        });

        try {
            activity('p2h')
                ->causedBy(auth()->user())
                ->performedOn($entry)
                ->withProperties([
                    'unit' => $session->unit?->no_unit,
                    'tanggal' => $session->tanggal?->toDateString(),
                    'shift' => $entry->shift,
                    'slot' => $entry->user_slot,
                ])
                ->log("Menghapus entry P2H slot {$entry->user_slot} unit {$session->unit?->no_unit}");
        } catch (\Throwable $e) {
            Log::warning('Activity log gagal dicatat', [
                'entry_id' => $entry->id,
                'error' => $e->getMessage(),
            ]);
        }

        if ($sessionDeleted) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'Entry terakhir dihapus, sesi P2H dihapus otomatis',
            ]);

            return redirect()->route('p2h.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Entry shift berhasil dihapus',
        ]);

        return redirect()->route('p2h.show', $session->id);
    }

    public function show(Request $request, P2hSession $session): Response
    {
        $this->authorize('view', $session);

        $entryScope = function ($query) use ($request) {
            $user = $request->user();
            if ($user->isStaffOnly()) {
                $query->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('pic_approver_id', $user->id));
            } elseif (! $user->isPrivileged()) {
                $query->where('user_id', $user->id);
            }
        };

        $session->load([
            'unit',
            'userEntries' => $entryScope,
            'userEntries.user',
            'userEntries.approver',
            'userEntries.pic',
            'userEntries.answers.inspectionItem',
            'userEntries.fuelLog',
            'userEntries.attachments',
            'serviceInfo',
        ]);

        $inspectionItems = HistoricalInspectionItems::fromEntries($session->userEntries);

        $session->userEntries->each(function (P2hUserEntry $entry) {
            if ($entry->paraf_url) {
                $entry->setAttribute('paraf_url', route('p2h.signature', [$entry, 'submitter']));
            }
            if ($entry->approver_signature_url) {
                $entry->setAttribute('approver_signature_url', route('p2h.signature', [$entry, 'approver']));
            }
            $entry->attachments->each(fn (P2hAttachment $attachment) => $attachment->setAttribute(
                'path', route('p2h.attachment', $attachment)
            ));
        });

        return Inertia::render('p2h/show', [
            'session' => $session,
            'inspectionItems' => $inspectionItems,
        ]);
    }
}
