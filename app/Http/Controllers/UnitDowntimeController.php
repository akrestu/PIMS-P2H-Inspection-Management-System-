<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UnitDowntimeController extends Controller
{
    public function index(Request $request): Response
    {
        $query = UnitDowntimeLog::with(['unit', 'creator'])
            ->orderByDesc('jam_mulai');

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->unit_id);
        }

        if ($request->filled('tipe')) {
            $query->where('tipe', $request->tipe);
        }

        if ($request->filled('date_from')) {
            $query->where(function ($range) use ($request) {
                $range->whereNull('jam_selesai')
                    ->orWhere('jam_selesai', '>=', $request->date_from.' 00:00:00');
            });
        }

        if ($request->filled('date_to')) {
            $query->where('jam_mulai', '<=', $request->date_to.' 23:59:59');
        }

        if ($request->status === 'ongoing') {
            $query->whereNull('jam_selesai');
        } elseif ($request->status === 'completed') {
            $query->whereNotNull('jam_selesai');
        }

        $logs = $query->paginate(20)->withQueryString();

        $allUnits = Unit::active()->orderBy('no_unit')->get(['id', 'no_unit', 'jenis_unit']);

        // Summary stats
        $ongoingCount = UnitDowntimeLog::whereNull('jam_selesai')->count();

        return Inertia::render('downtime/index', [
            'logs' => $logs->through(fn ($log) => [
                'id' => $log->id,
                'unit_id' => $log->unit_id,
                'no_unit' => $log->unit->no_unit,
                'jenis_unit' => $log->unit->jenis_unit,
                'tipe' => $log->tipe,
                'jam_mulai' => $log->jam_mulai->format('Y-m-d H:i'),
                'jam_selesai' => $log->jam_selesai?->format('Y-m-d H:i'),
                'duration_hours' => $log->duration_hours,
                'keterangan' => $log->keterangan,
                'created_by' => $log->creator?->name,
            ]),
            'allUnits' => $allUnits,
            'filters' => $request->only(['unit_id', 'tipe', 'date_from', 'date_to', 'status']),
            'ongoingCount' => $ongoingCount,
        ]);
    }

    /** Cek apakah rentang waktu bertabrakan dengan log downtime unit lain yang sudah ada. */
    private function hasOverlap(int $unitId, string $jamMulai, ?string $jamSelesai, ?int $excludeId = null): bool
    {
        return UnitDowntimeLog::where('unit_id', $unitId)
            ->when($excludeId, fn ($q) => $q->whereKeyNot($excludeId))
            ->where(function ($q) use ($jamMulai, $jamSelesai) {
                // existing.jam_mulai < new.jam_selesai (atau tak terbatas jika new masih berjalan)
                $q->where(function ($q2) use ($jamSelesai) {
                    if ($jamSelesai !== null) {
                        $q2->where('jam_mulai', '<', $jamSelesai);
                    }
                })
                    ->where(function ($q3) use ($jamMulai) {
                        // existing.jam_selesai > new.jam_mulai, atau existing masih berjalan (null)
                        $q3->whereNull('jam_selesai')->orWhere('jam_selesai', '>', $jamMulai);
                    });
            })
            ->exists();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('status', 'active')->whereNull('deleted_at')],
            'tipe' => ['required', Rule::in(['BD', 'PM', 'Servis Berkala'])],
            'jam_mulai' => ['required', 'date'],
            'jam_selesai' => ['nullable', 'date', 'after:jam_mulai'],
            'keterangan' => ['nullable', 'string', 'max:500'],
        ]);

        $created = DB::transaction(function () use ($data, $request): bool {
            Unit::whereKey($data['unit_id'])->lockForUpdate()->firstOrFail();

            if ($this->hasOverlap($data['unit_id'], $data['jam_mulai'], $data['jam_selesai'] ?? null)) {
                return false;
            }

            UnitDowntimeLog::create([
                ...$data,
                'created_by' => $request->user()->id,
            ]);

            return true;
        });

        if (! $created) {
            return back()->withErrors(['jam_mulai' => 'Rentang waktu bertabrakan dengan log downtime unit ini yang sudah ada.']);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Downtime berhasil dicatat',
            'description' => "Log {$data['tipe']} berhasil disimpan.",
        ]);

        return back();
    }

    public function update(Request $request, UnitDowntimeLog $log): RedirectResponse
    {
        $data = $request->validate([
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('status', 'active')->whereNull('deleted_at')],
            'tipe' => ['required', Rule::in(['BD', 'PM', 'Servis Berkala'])],
            'jam_mulai' => ['required', 'date'],
            'jam_selesai' => ['nullable', 'date', 'after:jam_mulai'],
            'keterangan' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = DB::transaction(function () use ($data, $log): bool {
            Unit::whereKey($data['unit_id'])->lockForUpdate()->firstOrFail();
            UnitDowntimeLog::whereKey($log->id)->lockForUpdate()->firstOrFail();

            if ($this->hasOverlap($data['unit_id'], $data['jam_mulai'], $data['jam_selesai'] ?? null, $log->id)) {
                return false;
            }

            $log->update($data);

            return true;
        });

        if (! $updated) {
            return back()->withErrors(['jam_mulai' => 'Rentang waktu bertabrakan dengan log downtime unit ini yang sudah ada.']);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Downtime berhasil diperbarui',
            'description' => "Log {$data['tipe']} berhasil diperbarui.",
        ]);

        return back();
    }

    public function destroy(UnitDowntimeLog $log): RedirectResponse
    {
        $log->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Downtime berhasil dihapus',
        ]);

        return back();
    }
}
