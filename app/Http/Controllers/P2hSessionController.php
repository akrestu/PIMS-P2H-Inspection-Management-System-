<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreP2hRequest;
use App\Models\P2hChecklistAnswer;
use App\Models\P2hFuelLog;
use App\Models\P2hInspectionItem;
use App\Models\P2hServiceInfo;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Notifications\CriticalItemAlert;
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
        $user = $request->user();

        $query = P2hSession::with(['unit', 'userEntries.answers'])
            ->when($request->date_from, fn ($q) => $q->whereDate('tanggal', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('tanggal', '<=', $request->date_to))
            ->when($request->no_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('no_unit', 'like', "%{$request->no_unit}%")))
            ->when($request->jenis_unit, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('jenis_unit', $request->jenis_unit)))
            ->when($request->hasil === 'ada_tl', fn ($q) => $q->whereHas('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')))
            ->when($request->hasil === 'semua_layak', fn ($q) => $q->whereDoesntHave('userEntries.answers', fn ($a) => $a->where('kondisi', 'Tidak Layak')));

        // Driver hanya lihat P2H yang pernah ia isi
        if ($user->hasRole('driver')) {
            $query->whereHas('userEntries', fn ($q) => $q->where('user_id', $user->id));
        }

        $sessions = $query->latest()->paginate(15)->withQueryString();

        $mapped = $sessions->through(function ($session) {
            return [
                'id'          => $session->id,
                'tanggal'     => $session->tanggal->format('d/m/Y'),
                'no_unit'     => $session->unit->no_unit,
                'jenis_unit'  => $session->unit->jenis_unit,
                'slot_terisi' => $session->userEntries->count(),
                'total_tl'    => $session->userEntries->sum(fn ($e) => $e->answers->where('kondisi', 'Tidak Layak')->count()),
                'status'      => $session->status,
            ];
        });

        return Inertia::render('p2h/index', [
            'sessions' => $mapped,
            'filters'  => $request->only(['date_from', 'date_to', 'no_unit', 'jenis_unit', 'hasil']),
        ]);
    }

    public function create(): Response
    {
        $driver = auth()->user()->driver;
        $units = Unit::active()
            ->when(
                $driver?->jenis_unit,
                fn ($q) => $q->where('jenis_unit', $driver->jenis_unit)
            )
            ->orderBy('no_unit')
            ->get(['id', 'no_unit', 'jenis_unit']);
        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        return Inertia::render('p2h/form', [
            'units'           => $units,
            'inspectionItems' => $inspectionItems,
        ]);
    }

    public function checkSlot(Request $request): JsonResponse
    {
        $request->validate(['unit_id' => 'required|exists:units,id']);

        $session = P2hSession::where('unit_id', $request->unit_id)
            ->whereDate('tanggal', today())
            ->first();

        $slotTerisi = $session ? $session->userEntries()->count() : 0;

        return response()->json([
            'session_id'    => $session?->id,
            'slot_terisi'   => $slotTerisi,
            'slot_tersedia' => $slotTerisi < 4,
            'next_slot'     => $slotTerisi + 1,
        ]);
    }

    public function store(StoreP2hRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $slotPenuh = false;

        DB::transaction(function () use ($data, $user, &$session, &$slotPenuh) {
            // Buat atau ambil session, lalu lock row untuk prevent race condition
            $session = P2hSession::firstOrCreate(
                ['unit_id' => $data['unit_id'], 'tanggal' => today()],
                ['status' => 'open', 'created_by' => $user->id]
            );

            // Pessimistic lock — blokir concurrent request untuk unit + tanggal yang sama
            $session = P2hSession::where('id', $session->id)->lockForUpdate()->first();

            if ($session->userEntries()->count() >= 4) {
                $slotPenuh = true;
                return;
            }

            $nextSlot = $session->userEntries()->count() + 1;

            // Simpan signature
            $parafUrl = null;
            if (! empty($data['paraf'])) {
                $base64  = preg_replace('/^data:image\/\w+;base64,/', '', $data['paraf']);
                $imgData = base64_decode($base64);
                $filename = 'signatures/' . Str::uuid() . '.png';
                Storage::disk('public')->put($filename, $imgData);
                $parafUrl = $filename;
            }

            // Buat user entry
            $entry = P2hUserEntry::create([
                'p2h_session_id'      => $session->id,
                'user_id'             => $user->id,
                'user_slot'           => $nextSlot,
                'km_awal'             => $data['km_awal'],
                'shift'               => $data['shift'],
                'paraf_url'           => $parafUrl,
                'submitted_at'        => now(),
                'kondisi_akhir'       => $data['kondisi_akhir'],
                'justifikasi_kondisi' => $data['justifikasi_kondisi'] ?? null,
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

            // Cek item Critical Tidak Layak → dispatch notifikasi
            $criticalTL = $entry->answers()
                ->with('inspectionItem')
                ->where('kondisi', 'Tidak Layak')
                ->whereHas('inspectionItem', fn ($q) => $q->where('risiko', 'Critical'))
                ->get();

            if ($criticalTL->isNotEmpty()) {
                $admins = \App\Models\User::role('admin')->get();
                foreach ($admins as $admin) {
                    $admin->notify(new CriticalItemAlert(
                        session: $session,
                        entry: $entry,
                        criticalItems: $criticalTL,
                    ));
                }
            }

            // Tandai session completed jika sudah 4 slot
            if ($session->userEntries()->count() >= 4) {
                $session->update(['status' => 'completed']);
            }
        }, attempts: 3);

        if ($slotPenuh) {
            return back()->withErrors(['unit_id' => 'Slot P2H untuk unit ini sudah penuh (4/4) hari ini.']);
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
            ->filter(fn ($a) => $a->inspectionItem?->risiko === 'Critical')
            ->isNotEmpty();

        if ($hasCritical) {
            Inertia::flash('toast', [
                'type'        => 'error',
                'message'     => 'P2H disimpan — Ada item Critical TL!',
                'description' => "Slot {$slotTerisi}/4 terisi. Terdapat item risiko Critical yang tidak layak. Admin telah diberitahu.",
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => 'P2H berhasil disimpan',
                'description' => "Slot {$slotTerisi}/4 terisi untuk unit {$session->unit->no_unit}.",
            ]);
        }

        return redirect()->route('p2h.show', $session);
    }

    public function destroy(P2hSession $session): RedirectResponse
    {
        DB::transaction(function () use ($session) {
            // Hapus file signature dari storage
            $session->load('userEntries');
            foreach ($session->userEntries as $entry) {
                if ($entry->paraf_url) {
                    Storage::disk('public')->delete($entry->paraf_url);
                }
            }
            $session->delete();
        });

        Inertia::flash('toast', [
            'type'    => 'success',
            'message' => 'Sesi P2H berhasil dihapus',
        ]);

        return redirect()->route('p2h.index');
    }

    public function show(Request $request, P2hSession $session): Response
    {
        $this->authorize('view', $session);

        $session->load([
            'unit',
            'userEntries.user.driver',
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
