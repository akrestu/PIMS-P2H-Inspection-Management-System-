<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::with(['roles', 'driver.units'])
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($inner) use ($request) {
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('nik', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                          ->orWhereHas('driver', fn ($d) => $d->where('nama', 'like', "%{$request->search}%"));
                });
            })
            ->when($request->role, fn ($q) => $q->role($request->role))
            ->latest();

        $users = $query->paginate(15)->withQueryString();

        $stats = [
            'total'   => User::count(),
            'admin'   => User::role('admin')->count(),
            'manager' => User::role('manager')->count(),
            'driver'  => User::role('driver')->count(),
        ];

        return Inertia::render('users/index', [
            'users'   => $users,
            'filters' => $request->only(['search', 'role']),
            'stats'   => $stats,
            'units'   => Unit::active()->orderBy('no_unit')->get(['id', 'no_unit', 'jenis_unit']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'nik'        => 'required|string|max:20|unique:users,nik',
            'email'      => 'required|email|max:255|unique:users,email',
            'password'   => ['required', Password::defaults()],
            'role'       => 'required|in:admin,manager,driver',
            // Driver-only fields
            'nama'       => 'required_if:role,driver|nullable|string|max:255',
            'department' => 'required_if:role,driver|nullable|string|max:255',
            'jenis_unit'          => 'nullable|in:Bus,Light Vehicle',
            'assigned_unit_ids'   => 'nullable|array',
            'assigned_unit_ids.*' => 'integer|exists:units,id',
        ]);

        DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['name'],
                'nik'      => $validated['nik'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            $user->assignRole($validated['role']);

            if ($validated['role'] === 'driver') {
                $driver = Driver::create([
                    'user_id'    => $user->id,
                    'nik'        => $validated['nik'],
                    'nama'       => $validated['nama'],
                    'department' => $validated['department'],
                    'jenis_unit' => $validated['jenis_unit'] ?? null,
                ]);
                $driver->units()->sync($validated['assigned_unit_ids'] ?? []);
            }
        });

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'User berhasil ditambahkan',
            'description' => "Akun {$validated['name']} berhasil dibuat.",
        ]);

        return redirect()->route('users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'nik'        => ['required', 'string', 'max:20', Rule::unique('users', 'nik')->ignore($user->id)],
            'email'      => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'       => 'required|in:admin,manager,driver',
            'password'   => ['nullable', Password::defaults()],
            // Driver-only fields
            'nama'       => 'required_if:role,driver|nullable|string|max:255',
            'department' => 'required_if:role,driver|nullable|string|max:255',
            'jenis_unit'          => 'nullable|in:Bus,Light Vehicle',
            'assigned_unit_ids'   => 'nullable|array',
            'assigned_unit_ids.*' => 'integer|exists:units,id',
        ]);

        DB::transaction(function () use ($validated, $user) {
            $userData = [
                'name'  => $validated['name'],
                'nik'   => $validated['nik'],
                'email' => $validated['email'],
            ];
            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }
            $user->update($userData);

            $user->syncRoles([$validated['role']]);

            if ($validated['role'] === 'driver') {
                $driver = $user->driver()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'nik'        => $validated['nik'],
                        'nama'       => $validated['nama'],
                        'department' => $validated['department'],
                        'jenis_unit' => $validated['jenis_unit'] ?? null,
                    ]
                );
                $driver->units()->sync($validated['assigned_unit_ids'] ?? []);
            } else {
                $user->driver()->delete();
            }
        });

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Data user diperbarui',
            'description' => "Data {$validated['name']} berhasil diperbarui.",
        ]);

        return redirect()->route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus akun sendiri.']);
        }

        $user->delete();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'User berhasil dihapus',
            'description' => "Akun {$user->name} dihapus dari sistem.",
        ]);

        return redirect()->route('users.index');
    }
}
