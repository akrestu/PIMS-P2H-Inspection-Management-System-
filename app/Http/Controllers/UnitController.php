<?php

namespace App\Http\Controllers;

use App\Exports\UnitsExport;
use App\Exports\UnitsImportTemplateExport;
use App\Http\Requests\StoreUnitRequest;
use App\Imports\UnitsImport;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        $units = Unit::query()
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
            'description' => "Unit {$noUnit} telah dihapus dari sistem.",
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
            'description' => "Unit yang dipilih telah dihapus dari sistem.",
        ]);

        return redirect()->route('units.index');
    }

    public function export(): BinaryFileResponse
    {
        $units = Unit::latest()->get();
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
            Inertia::flash('toast', [
                'type'        => 'warning',
                'message'     => "Import selesai: {$summary}, " . count($errors) . ' baris gagal.',
                'description' => implode(' | ', array_slice($errors, 0, 3)) . (count($errors) > 3 ? '...' : ''),
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
