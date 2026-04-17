<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUnitRequest;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
        $unit->delete();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Unit berhasil dihapus',
            'description' => "Unit {$noUnit} telah dihapus dari sistem.",
        ]);

        return redirect()->route('units.index');
    }
}
