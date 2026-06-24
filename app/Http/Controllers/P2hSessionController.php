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
use App\Models\Unit;
use App\Models\User;
use App\Notifications\CriticalItemAlert;
use App\Notifications\LvP2hApprovalRequest;
use App\Policies\P2hSessionPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class P2hSessionController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'date_from'  => 'nullable|date_format:Y-m-d',
            'date_to'    => 'nullable|date_format:Y-m-d',
            'jenis_unit' => 'nullable|in:Bus,Light Vehicle',
            'hasil'      => 'nullable|in:ada_tl,semua_layak',
            'user_id'    => 'nullable|integer|exists:users,id',
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

        // Driver hanya lihat P2H yang pernah ia isi
        if ($user->hasRole('driver')) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($user->isStaffOnly()) {
            // Staff/Sr.Staff non-admin/manager: hanya lihat sesi dimana mereka jadi PIC approver
            $query->whereHas('userEntries', fn ($q) => $q->where('pic_approver_id', $user->id));
        }
        // Admin/manager: tidak ada filter tambahan → lihat semua

        $sessions = $query->latest()->paginate(15)->withQueryString();

        $mapped = $sessions->through(function ($session) {
            return [
                'id'          => $session->id,
                'tanggal'     => $session->tanggal->format('Y-m-d'),
                'no_unit'     => $session->unit->no_unit,
                'jenis_unit'  => $session->unit->jenis_unit,
                'slot_terisi' => $session->userEntries->count(),
                'total_tl'    => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                'status'      => $session->status,
            ];
        });

        // Kirim daftar user (hanya untuk admin/manager) untuk filter driver
        $allUsers = $user->hasAnyRole(['admin', 'manager'])
            ? User::role('driver')->orderBy('name')->get(['id', 'name'])
            : collect();

        return Inertia::render('p2h/index', [
            'sessions' => $mapped,
            'filters'  => $request->only(['date_from', 'date_to', 'no_unit', 'jenis_unit', 'hasil', 'user_id']),
            'allUsers' => $allUsers,
        ]);
    }

    public function create(): Response
    {
        $user = auth()->user();

        $assignedUnits = $user->units()->active()->orderBy('no_unit')->get(['units.id', 'no_unit', 'jenis_unit', 'units.department']);

        if ($assignedUnits->isNotEmpty()) {
            $units = $assignedUnits;
        } else {
            $units = Unit::active()
                ->when($user->jenis_unit, fn ($q) => $q->where('jenis_unit', $user->jenis_unit))
                ->orderBy('no_unit')
                ->get(['id', 'no_unit', 'jenis_unit', 'department']);
        }
        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        $picJabatanMap = ['Non Staff' => 'Staff', 'Staff' => 'Sr.Staff'];
        $picJabatan    = $picJabatanMap[$user->jabatan] ?? null;

        $staffUsers = $picJabatan
            ? User::where('jabatan', $picJabatan)->orderBy('name')->get(['id', 'name', 'jabatan', 'department'])
            : collect();

        return Inertia::render('p2h/form', [
            'units'           => $units,
            'inspectionItems' => $inspectionItems,
            'staffUsers'      => $staffUsers,
        ]);
    }

    public function checkSlot(Request $request): JsonResponse
    {
        $request->validate(['unit_id' => 'required|exists:units,id']);

        $session = P2hSession::where('unit_id', $request->unit_id)
            ->whereDate('tanggal', today())
            ->first();

        $slotTerisi = $session ? $session->userEntries()->count() : 0;

        $lastEntry = P2hUserEntry::whereHas('session', fn($q) => $q->where('unit_id', $request->unit_id))
            ->whereNotNull('hm_km_akhir')
            ->latest('id')
            ->first();

        return response()->json([
            'session_id'       => $session?->id,
            'slot_terisi'      => $slotTerisi,
            'slot_tersedia'    => true,
            'next_slot'        => $slotTerisi + 1,
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
                    'unit_id'    => $data['unit_id'],
                    'tanggal'    => today(),
                    'status'     => 'open',
                    'created_by' => $user->id,
                    'job_site'   => $data['job_site'] ?? null,
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() !== '23000') throw $e;
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

        DB::transaction(function () use ($data, $user, $session) {

            $nextSlot = $session->userEntries()->count() + 1;

            // Simpan signature
            $parafUrl = null;
            if (! empty($data['paraf'])) {
                $base64  = preg_replace('/^data:image\/\w+;base64,/', '', $data['paraf']);
                $imgData = base64_decode($base64, strict: true);

                // Validasi bahwa data adalah gambar PNG/JPEG yang valid
                if ($imgData === false) {
                    throw new \InvalidArgumentException('Data tanda tangan tidak valid.');
                }
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mime  = $finfo->buffer($imgData);
                if (! in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
                    throw new \InvalidArgumentException('Format tanda tangan tidak didukung.');
                }

                $filename = 'signatures/' . Str::uuid() . '.png';
                Storage::disk('public')->put($filename, $imgData);
                $parafUrl = $filename;
            }

            // Tentukan apakah entry ini perlu approval: LV + user adalah Non Staff
            $unit = Unit::withTrashed()->find($data['unit_id']);
            $needsApproval = $unit?->jenis_unit === 'Light Vehicle' && $user->needsLvApproval();

            // Buat user entry
            $entry = P2hUserEntry::create([
                'p2h_session_id'      => $session->id,
                'user_id'             => $user->id,
                'user_slot'           => $nextSlot,
                'lokasi_kerja'        => $data['lokasi_kerja'] ?? null,
                'km_awal'             => $data['km_awal'] ?? null,
                'hm_km_akhir'         => $data['hm_km_akhir'] ?? null,
                'shift'               => $data['shift'],
                'paraf_url'           => $parafUrl,
                'submitted_at'        => now(),
                'kondisi_akhir'       => $data['kondisi_akhir'],
                'justifikasi_kondisi' => $data['justifikasi_kondisi'] ?? null,
                'approval_status'     => $needsApproval ? 'pending' : null,
                'pic_approver_id'     => $needsApproval ? ($data['pic_approver_id']) : null,
            ]);

            // Simpan jawaban checklist
            foreach ($data['answers'] as $answer) {
                P2hChecklistAnswer::create([
                    'p2h_user_entry_id'  => $entry->id,
                    'inspection_item_id' => $answer['inspection_item_id'],
                    'kondisi'            => $answer['kondisi'],
                    'keterangan'         => $answer['keterangan'] ?? null,
                ]);
            }

            // Simpan service info (hanya untuk slot 1)
            if ($nextSlot === 1 && ! empty($data['service_info'])) {
                P2hServiceInfo::create(array_merge(
                    ['p2h_session_id' => $session->id],
                    $data['service_info']
                ));
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
                $path = $file->store("p2h-attachments/{$entry->id}", 'public');
                P2hAttachment::create([
                    'p2h_user_entry_id'  => $entry->id,
                    'inspection_item_id' => null,
                    'path'               => $path,
                ]);
            }

            // Simpan attachment per item checklist (opsional)
            foreach ($request->file('item_attachments', []) as $itemId => $files) {
                foreach ((array) $files as $file) {
                    $path = $file->store("p2h-attachments/{$entry->id}/items/{$itemId}", 'public');
                    P2hAttachment::create([
                        'p2h_user_entry_id'  => $entry->id,
                        'inspection_item_id' => (int) $itemId,
                        'path'               => $path,
                    ]);
                }
            }

            // Hitung score entry ini dan update best_compliance_score di sesi
            $totalAnswers = count($data['answers']);
            $layakAnswers = collect($data['answers'])->where('kondisi', 'Layak')->count();
            $entryScore   = $totalAnswers > 0 ? round(($layakAnswers / $totalAnswers) * 100, 1) : null;

            if ($entryScore !== null) {
                $current = $session->best_compliance_score;
                if ($current === null || $entryScore > $current) {
                    $session->update(['best_compliance_score' => $entryScore]);
                }
            }

            // Cek item kode_bahaya AA + Tidak Layak → notifikasi admin
            $criticalTL = $entry->answers()
                ->with('inspectionItem')
                ->where('kondisi', 'Tidak Layak')
                ->whereHas('inspectionItem', fn ($q) => $q->where('kode_bahaya', 'AA'))
                ->get();

            if ($criticalTL->isNotEmpty()) {
                // Throttle: satu notifikasi per unit per hari, hindari spam saat banyak submit bersamaan
                $alertKey = "critical_alert_sent_unit_{$session->unit_id}_" . today()->toDateString();
                $alreadySent = cache()->get($alertKey, false);

                if (! $alreadySent) {
                    cache()->put($alertKey, true, now()->endOfDay());
                    $admins = \App\Models\User::role('admin')->get();
                    foreach ($admins as $admin) {
                        $admin->notify(new CriticalItemAlert(
                            session: $session,
                            entry: $entry,
                            criticalItems: $criticalTL,
                        ));
                    }
                }
            }

            // Kirim notifikasi approval hanya ke PIC yang dipilih oleh submitter
            if ($needsApproval && ! empty($data['pic_approver_id'])) {
                $pic = \App\Models\User::find($data['pic_approver_id']);
                if (! $pic) {
                    // PIC tidak ditemukan — reset approval agar entry tidak tergantung selamanya
                    $entry->update(['approval_status' => null, 'pic_approver_id' => null]);
                } else {
                    $pic->notify(new LvP2hApprovalRequest(
                        session: $session,
                        entry: $entry,
                        submitter: $user,
                    ));
                }
            }

        }, attempts: 3);

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
                'type'        => 'error',
                'message'     => 'P2H disimpan — Ada item Critical TL!',
                'description' => "Pengisian ke-{$slotTerisi} untuk unit {$session->unit->no_unit}. Terdapat item kode bahaya AA (Stop) yang tidak layak. Admin telah diberitahu.",
            ]);
        } elseif ($isPendingApproval) {
            $picName = $latestEntry?->pic?->name ?? 'PIC yang dipilih';
            Inertia::flash('toast', [
                'type'        => 'warning',
                'message'     => 'P2H disubmit — Menunggu Verifikasi',
                'description' => "P2H unit {$session->unit->no_unit} menunggu persetujuan dari {$picName}.",
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => 'P2H berhasil disimpan',
                'description' => "Pengisian ke-{$slotTerisi} untuk unit {$session->unit->no_unit}.",
            ]);
        }

        return redirect()->route('p2h.show', $session->id);
    }

    public function destroy(P2hSession $session): RedirectResponse
    {
        $this->authorize('delete', $session);

        activity('p2h')
            ->causedBy(auth()->user())
            ->performedOn($session)
            ->withProperties([
                'unit'    => $session->unit?->no_unit,
                'tanggal' => $session->tanggal?->toDateString(),
            ])
            ->log("Menghapus sesi P2H unit {$session->unit?->no_unit} tanggal {$session->tanggal?->toDateString()}");

        $session->delete();

        Inertia::flash('toast', [
            'type'    => 'success',
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
            }
        });

        try {
            activity('p2h')
                ->causedBy(auth()->user())
                ->performedOn($entry)
                ->withProperties([
                    'unit'    => $session->unit?->no_unit,
                    'tanggal' => $session->tanggal?->toDateString(),
                    'shift'   => $entry->shift,
                    'slot'    => $entry->user_slot,
                ])
                ->log("Menghapus entry P2H slot {$entry->user_slot} unit {$session->unit?->no_unit}");
        } catch (\Throwable $e) {
            Log::warning('Activity log gagal dicatat', [
                'entry_id' => $entry->id,
                'error'    => $e->getMessage(),
            ]);
        }

        if ($sessionDeleted) {
            Inertia::flash('toast', [
                'type'    => 'success',
                'message' => 'Entry terakhir dihapus, sesi P2H dihapus otomatis',
            ]);
            return redirect()->route('p2h.index');
        }

        Inertia::flash('toast', [
            'type'    => 'success',
            'message' => 'Entry shift berhasil dihapus',
        ]);

        return redirect()->route('p2h.show', $session->id);
    }

    public function show(Request $request, P2hSession $session): Response
    {
        $this->authorize('view', $session);

        $session->load([
            'unit',
            'userEntries.user',
            'userEntries.approver',
            'userEntries.pic',
            'userEntries.answers.inspectionItem',
            'userEntries.fuelLog',
            'serviceInfo',
        ]);

        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        return Inertia::render('p2h/show', [
            'session'        => $session,
            'inspectionItems' => $inspectionItems,
        ]);
    }
}
