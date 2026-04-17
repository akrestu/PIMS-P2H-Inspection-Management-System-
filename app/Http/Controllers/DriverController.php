<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class DriverController extends Controller
{
    public function index(Request $request): Response
    {
        $drivers = Driver::with('user')
            ->when($request->search, function ($q) use ($request) {
                $q->where('nama', 'like', "%{$request->search}%")
                    ->orWhere('nik', 'like', "%{$request->search}%");
            })
            ->when($request->department, fn ($q) => $q->where('department', $request->department))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $stats = [
            'total'       => Driver::count(),
            'departments' => Driver::select('department')
                ->distinct()
                ->orderBy('department')
                ->pluck('department'),
        ];

        return Inertia::render('drivers/index', [
            'drivers' => $drivers,
            'filters' => $request->only(['search', 'department']),
            'stats'   => $stats,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('drivers/form');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => ['required', Password::defaults()],
            'nik'        => 'required|string|unique:drivers,nik',
            'nama'       => 'required|string|max:255',
            'department' => 'required|string|max:255',
        ]);

        DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            $user->assignRole('driver');

            Driver::create([
                'user_id'    => $user->id,
                'nik'        => $validated['nik'],
                'nama'       => $validated['nama'],
                'department' => $validated['department'],
            ]);
        });

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Driver berhasil ditambahkan',
            'description' => "Akun driver {$validated['nama']} (NIK: {$validated['nik']}) telah dibuat.",
        ]);

        return redirect()->route('drivers.index');
    }

    public function edit(Driver $driver): Response
    {
        return Inertia::render('drivers/form', ['driver' => $driver->load('user')]);
    }

    public function update(Request $request, Driver $driver): RedirectResponse
    {
        $validated = $request->validate([
            'nik'        => "required|string|unique:drivers,nik,{$driver->id}",
            'nama'       => 'required|string|max:255',
            'department' => 'required|string|max:255',
        ]);

        $driver->update($validated);

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Data driver diperbarui',
            'description' => "Profil {$driver->nama} berhasil disimpan.",
        ]);

        return redirect()->route('drivers.index');
    }
}
