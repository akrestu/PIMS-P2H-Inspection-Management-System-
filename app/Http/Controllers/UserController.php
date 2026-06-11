<?php

namespace App\Http\Controllers;

use App\Exports\UsersExport;
use App\Exports\UsersImportTemplateExport;
use App\Imports\UsersImport;
use App\Models\Driver;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
            'email'      => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->whereNotNull('email')],
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

            activity('user')
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties(['role' => $validated['role'], 'nik' => $validated['nik']])
                ->log("Membuat user baru: {$user->name} ({$validated['role']})");

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
            'email'      => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)->whereNotNull('email')],
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

            $oldRole = $user->getRoleNames()->first();
            $user->syncRoles([$validated['role']]);

            $props = ['role_lama' => $oldRole, 'role_baru' => $validated['role']];
            activity('user')
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties($props)
                ->log("Memperbarui user: {$user->name}" . ($oldRole !== $validated['role'] ? " (role: {$oldRole} → {$validated['role']})" : ''));

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

        // Manager tidak boleh menghapus akun admin
        if (! auth()->user()->hasRole('admin') && $user->hasRole('admin')) {
            return back()->withErrors(['error' => 'Tidak memiliki izin untuk menghapus akun admin.']);
        }

        activity('user')
            ->causedBy(auth()->user())
            ->withProperties(['name' => $user->name, 'nik' => $user->nik, 'role' => $user->getRoleNames()->first()])
            ->log("Menghapus user: {$user->name} ({$user->getRoleNames()->first()})");

        $user->delete();

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'User berhasil dihapus',
            'description' => "Akun {$user->name} dihapus dari sistem.",
        ]);

        return redirect()->route('users.index');
    }

    public function export(): BinaryFileResponse
    {
        $users = User::with(['roles', 'driver'])->latest()->get();
        return Excel::download(new UsersExport($users), 'users_' . now()->format('Ymd_His') . '.xlsx');
    }

    public function importTemplate(): BinaryFileResponse
    {
        return Excel::download(new UsersImportTemplateExport(), 'template_import_users.xlsx');
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:2048',
        ]);

        $import = new UsersImport();
        Excel::import($import, $request->file('file'));

        $success = $import->successCount();
        $errors  = $import->rowErrors();

        if (count($errors) > 0) {
            Inertia::flash('toast', [
                'type'        => 'warning',
                'message'     => "Import selesai dengan {$success} berhasil, " . count($errors) . ' gagal.',
                'description' => implode(' | ', array_slice($errors, 0, 3)) . (count($errors) > 3 ? '...' : ''),
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => "Import berhasil",
                'description' => "{$success} user berhasil ditambahkan.",
            ]);
        }

        return redirect()->route('users.index');
    }
}
