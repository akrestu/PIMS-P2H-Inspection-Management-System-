<?php

namespace App\Http\Controllers;

use App\Exports\UnitsExport;
use App\Exports\UnitsImportTemplateExport;
use App\Http\Requests\StoreUnitRequest;
use App\Imports\UnitsImport;
use App\Models\P2hSession;
use App\Models\Site;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        $units = Unit::query()
            ->with(['site:id,name', 'downtimeLogs' => function ($q) {
                $q->whereNull('jam_selesai')
                  ->latest('jam_mulai')
                  ->select(['id', 'unit_id', 'tipe', 'jam_mulai']);
            }])
            ->when($request->search, fn ($q) => $q->where('no_unit', 'like', "%{$request->search}%"))
            ->when($request->jenis_unit, fn ($q) => $q->where('jenis_unit', $request->jenis_unit))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $stats = [
            'total'    => Unit::count(),
            'active'   => Unit::where('status', 'active')->count(),
            'inactive' => Unit::where('status', 'inactive')->count(),
            'bus'      => Unit::where('jenis_unit', 'Bus')->count(),
            'lv'       => Unit::where('jenis_unit', 'Light Vehicle')->count(),
        ];

        return Inertia::render('units/index', [
            'units'   => $units,
            'filters' => $request->only(['search', 'jenis_unit', 'status']),
            'stats'   => $stats,
            'sites'   => Site::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('units/form');
    }

    public function store(StoreUnitRequest $request): RedirectResponse
    {
        $unit = Unit::create($request->validated());

        activity('unit')
            ->causedBy(auth()->user())
            ->performedOn($unit)
            ->log("Menambahkan unit: {$unit->no_unit} ({$unit->jenis_unit})");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit berhasil ditambahkan',
            'description' => "Unit {$unit->no_unit} ({$unit->jenis_unit}) telah terdaftar dalam sistem.",
        ]);

        return redirect()->route('units.index');
    }

    public function edit(Unit $unit): Response
    {
        return Inertia::render('units/form', ['unit' => $unit]);
    }

    public function update(StoreUnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        activity('unit')
            ->causedBy(auth()->user())
            ->performedOn($unit)
            ->log("Memperbarui unit: {$unit->no_unit}");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit berhasil diperbarui',
            'description' => "Data unit {$unit->no_unit} telah disimpan.",
        ]);

        return redirect()->route('units.index');
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        $noUnit = $unit->no_unit;

        activity('unit')
            ->causedBy(auth()->user())
            ->withProperties(['no_unit' => $noUnit, 'jenis_unit' => $unit->jenis_unit])
            ->log("Menghapus unit: {$noUnit}");

        $unit->delete();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit berhasil dihapus',
            'description' => "Unit {$noUnit} telah dipindahkan ke sampah dan dapat dipulihkan kembali.",
        ]);

        return redirect()->route('units.index');
    }

    public function destroyBatch(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:units,id',
        ]);

        $units   = Unit::whereIn('id', $request->ids)->get();
        $deleted = $units->count();

        foreach ($units as $unit) {
            activity('unit')
                ->causedBy(auth()->user())
                ->withProperties(['no_unit' => $unit->no_unit, 'jenis_unit' => $unit->jenis_unit])
                ->log("Menghapus unit (batch): {$unit->no_unit}");

            $unit->delete();
        }

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => "{$deleted} unit berhasil dihapus",
            'description' => "Unit yang dipilih telah dipindahkan ke sampah dan dapat dipulihkan kembali.",
        ]);

        return redirect()->route('units.index');
    }

    public function trashed(Request $request): Response
    {
        $units = Unit::onlyTrashed()
            ->with('site:id,name')
            ->when($request->search, fn ($q) => $q->where('no_unit', 'like', "%{$request->search}%"))
            ->orderByDesc('deleted_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('units/trashed', [
            'units'   => $units,
            'filters' => $request->only(['search']),
        ]);
    }

    public function restore(int $id): RedirectResponse
    {
        $unit = Unit::onlyTrashed()->findOrFail($id);
        $noUnit = $unit->no_unit;

        $unit->restore();

        activity('unit')
            ->causedBy(auth()->user())
            ->performedOn($unit)
            ->log("Memulihkan unit: {$noUnit}");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit berhasil dipulihkan',
            'description' => "Unit {$noUnit} telah dikembalikan ke daftar unit aktif.",
        ]);

        return redirect()->route('units.trashed');
    }

    public function forceDestroy(int $id): RedirectResponse
    {
        $unit = Unit::withTrashed()->findOrFail($id);
        $noUnit = $unit->no_unit;

        $sessionCount = DB::transaction(function () use ($unit) {
            $sessions = P2hSession::withTrashed()->where('unit_id', $unit->id)->get();

            foreach ($sessions as $session) {
                $session->forceDelete();
            }

            $unit->forceDelete();

            return $sessions->count();
        });

        activity('unit')
            ->causedBy(auth()->user())
            ->withProperties(['no_unit' => $noUnit, 'p2h_sessions_deleted' => $sessionCount])
            ->log("Menghapus permanen unit: {$noUnit} (beserta {$sessionCount} P2H terkait)");

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit dihapus permanen',
            'description' => "Unit {$noUnit} beserta {$sessionCount} P2H terkait telah dihapus permanen dari sistem.",
        ]);

        return redirect()->route('units.trashed');
    }

    public function export(): BinaryFileResponse
    {
        $units = Unit::with('site:id,name')->latest()->get();
        return Excel::download(new UnitsExport($units), 'units_' . now()->format('Ymd_His') . '.xlsx');
    }

    public function importTemplate(): BinaryFileResponse
    {
        return Excel::download(new UnitsImportTemplateExport(), 'template_import_units.xlsx');
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:2048',
        ]);

        $import = new UnitsImport();
        Excel::import($import, $request->file('file'));

        $success = $import->successCount();
        $updated = $import->updateCount();
        $errors  = $import->rowErrors();

        $parts = [];
        if ($success > 0) $parts[] = "{$success} unit baru ditambahkan";
        if ($updated > 0) $parts[] = "{$updated} unit diperbarui";
        $summary = implode(', ', $parts) ?: '0 perubahan';

        if (count($errors) > 0) {
            session()->flash('import_errors', $errors);
            Inertia::flash('toast', [
                'type'        => 'warning',
                'message'     => "Import selesai: {$summary}, " . count($errors) . ' baris gagal.',
                'description' => implode(' | ', array_slice($errors, 0, 5)) . (count($errors) > 5 ? ' (+' . (count($errors) - 5) . ' lainnya)' : ''),
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => 'Import berhasil',
                'description' => $summary . '.',
            ]);
        }

        return redirect()->route('units.index');
    }
}
