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
        $request->validate([
            'date_from'  => 'nullable|date_format:Y-m-d',
            'date_to'    => 'nullable|date_format:Y-m-d',
            'jenis_unit' => 'nullable|in:Bus,Light Vehicle',
            'hasil'      => 'nullable|in:ada_tl,semua_layak',
        ]);

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
                'tanggal'     => $session->tanggal->format('Y-m-d'),
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

        if ($driver) {
            $assignedUnits = $driver->units()->active()->orderBy('no_unit')->get(['units.id', 'no_unit', 'jenis_unit']);
        }

        if (!empty($assignedUnits) && $assignedUnits->isNotEmpty()) {
            $units = $assignedUnits;
        } else {
            $units = Unit::active()
                ->when($driver?->jenis_unit, fn ($q) => $q->where('jenis_unit', $driver->jenis_unit))
                ->orderBy('no_unit')
                ->get(['id', 'no_unit', 'jenis_unit']);
        }
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
            'slot_tersedia' => true,
            'next_slot'     => $slotTerisi + 1,
        ]);
    }

    public function store(StoreP2hRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        DB::transaction(function () use ($data, $user, &$session) {
            // Buat atau ambil session, lalu lock row untuk prevent race condition
            $session = P2hSession::firstOrCreate(
                ['unit_id' => $data['unit_id'], 'tanggal' => today()],
                ['status' => 'open', 'created_by' => $user->id, 'job_site' => $data['job_site'] ?? null]
            );

            // Pessimistic lock — blokir concurrent request untuk unit + tanggal yang sama
            $session = P2hSession::where('id', $session->id)->lockForUpdate()->first();

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

            // Cek item kode_bahaya AA + Tidak Layak → dispatch notifikasi
            $criticalTL = $entry->answers()
                ->with('inspectionItem')
                ->where('kondisi', 'Tidak Layak')
                ->whereHas('inspectionItem', fn ($q) => $q->where('kode_bahaya', 'AA'))
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

        if ($hasCritical) {
            Inertia::flash('toast', [
                'type'        => 'error',
                'message'     => 'P2H disimpan — Ada item Critical TL!',
                'description' => "Pengisian ke-{$slotTerisi} untuk unit {$session->unit->no_unit}. Terdapat item kode bahaya AA (Stop) yang tidak layak. Admin telah diberitahu.",
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => 'P2H berhasil disimpan',
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
