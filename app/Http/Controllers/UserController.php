<?php

namespace App\Http\Controllers;

use App\Exports\UsersExport;
use App\Exports\UsersImportTemplateExport;
use App\Imports\UsersImport;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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
        $query = User::with(['roles', 'units'])
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($inner) use ($request) {
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('nik', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                          ->orWhere('department', 'like', "%{$request->search}%");
                });
            })
            ->when($request->role, fn ($q) => $q->role($request->role))
            ->when($request->jabatan, fn ($q) => $q->where('jabatan', $request->jabatan))
            ->latest();

        $perPage = $request->per_page === 'all' ? $query->count() : (int) ($request->per_page ?? 15);
        $perPage = ($request->per_page === 'all' || in_array($perPage, [15, 50, 100])) ? max(1, $perPage) : 15;
        $users = $query->paginate($perPage)->withQueryString();

        $stats = [
            'total'   => User::count(),
            'admin'   => User::role('admin')->count(),
            'manager' => User::role('manager')->count(),
            'driver'  => User::role('driver')->count(),
        ];

        return Inertia::render('users/index', [
            'users'   => $users,
            'filters' => $request->only(['search', 'role', 'jabatan', 'per_page']),
            'stats'   => $stats,
            'units'   => Unit::active()->orderBy('no_unit')->get(['id', 'no_unit', 'jenis_unit']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'nik'                 => 'required|string|max:20|unique:users,nik',
            'email'               => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->whereNotNull('email')],
            'password'            => ['required', Password::defaults()],
            'role'                => 'required|in:admin,manager,driver',
            'jabatan'             => 'required_unless:role,admin|nullable|in:Sr.Staff,Staff,Non Staff',
            'department'          => 'required_unless:role,admin|nullable|string|max:255',
            'jenis_unit'          => 'nullable|in:Bus,Light Vehicle',
            'assigned_unit_ids'   => 'nullable|array',
            'assigned_unit_ids.*' => 'integer|exists:units,id',
        ]);

        DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'       => $validated['name'],
                'nik'        => $validated['nik'],
                'email'      => $validated['email'] ?? null,
                'password'   => Hash::make($validated['password']),
                'jabatan'    => $validated['role'] !== 'admin' ? ($validated['jabatan'] ?? null) : null,
                'department' => $validated['role'] !== 'admin' ? ($validated['department'] ?? null) : null,
                'jenis_unit' => $validated['jenis_unit'] ?? null,
            ]);
            $user->assignRole($validated['role']);

            if ($validated['role'] === 'driver') {
                $user->units()->sync($validated['assigned_unit_ids'] ?? []);
            }

            activity('user')
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'role'       => $validated['role'],
                    'jabatan'    => $user->jabatan,
                    'department' => $user->department,
                    'nik'        => $validated['nik'],
                ])
                ->log("Membuat user baru: {$user->name} ({$validated['role']})");
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
            'name'                => 'required|string|max:255',
            'nik'                 => ['required', 'string', 'max:20', Rule::unique('users', 'nik')->ignore($user->id)],
            'email'               => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)->whereNotNull('email')],
            'role'                => 'required|in:admin,manager,driver',
            'password'            => ['nullable', Password::defaults()],
            'jabatan'             => 'required_unless:role,admin|nullable|in:Sr.Staff,Staff,Non Staff',
            'department'          => 'required_unless:role,admin|nullable|string|max:255',
            'jenis_unit'          => 'nullable|in:Bus,Light Vehicle',
            'assigned_unit_ids'   => 'nullable|array',
            'assigned_unit_ids.*' => 'integer|exists:units,id',
        ]);

        DB::transaction(function () use ($validated, $user) {
            $userData = [
                'name'       => $validated['name'],
                'nik'        => $validated['nik'],
                'email'      => $validated['email'] ?? null,
                'jabatan'    => $validated['role'] !== 'admin' ? ($validated['jabatan'] ?? null) : null,
                'department' => $validated['role'] !== 'admin' ? ($validated['department'] ?? null) : null,
                'jenis_unit' => $validated['jenis_unit'] ?? null,
            ];
            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }
            $user->update($userData);

            $oldRole = $user->getRoleNames()->first();
            $user->syncRoles([$validated['role']]);

            // Sync assigned units (driver only; clear for other roles)
            if ($validated['role'] === 'driver') {
                $user->units()->sync($validated['assigned_unit_ids'] ?? []);
            } else {
                $user->units()->detach();
            }

            activity('user')
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'role_lama'  => $oldRole,
                    'role_baru'  => $validated['role'],
                    'jabatan'    => $user->jabatan,
                    'department' => $user->department,
                ])
                ->log("Memperbarui user: {$user->name}" . ($oldRole !== $validated['role'] ? " (role: {$oldRole} → {$validated['role']})" : ''));
        });

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'Data user diperbarui',
            'description' => "Data {$validated['name']} berhasil diperbarui.",
        ]);

        return redirect()->route('users.index');
    }

    public function destroyBatch(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:users,id',
        ]);

        $currentUser = auth()->user();

        $deleted = 0;
        $skipped = 0;
        $blocked = [];
        DB::transaction(function () use ($request, $currentUser, &$deleted, &$skipped, &$blocked) {
            foreach ($request->ids as $id) {
                $user = User::find($id);
                if (! $user) {
                    $skipped++;
                    continue;
                }
                // Lewati akun sendiri atau admin (jika bukan admin)
                if ($user->id == $currentUser->id || (! $currentUser->hasRole('admin') && $user->hasRole('admin'))) {
                    $skipped++;
                    continue;
                }
                try {
                    activity('user')
                        ->causedBy($currentUser)
                        ->withProperties(['name' => $user->name, 'nik' => $user->nik, 'role' => $user->getRoleNames()->first()])
                        ->log("Menghapus user: {$user->name} ({$user->getRoleNames()->first()})");
                    $user->delete();
                    $deleted++;
                } catch (QueryException $e) {
                    if ($e->getCode() === '23000') {
                        $blocked[] = $user->name;
                    } else {
                        throw $e;
                    }
                }
            }
        });

        $parts = [];
        if ($deleted > 0) $parts[] = "{$deleted} user berhasil dihapus.";
        if ($skipped > 0) $parts[] = "{$skipped} dilewati (akun sendiri / admin).";
        if (count($blocked) > 0) $parts[] = count($blocked) . ' tidak dapat dihapus karena memiliki data P2H/downtime: ' . implode(', ', $blocked) . '.';

        Inertia::flash('toast', [
            'type'        => count($blocked) > 0 ? 'warning' : 'success',
            'message'     => $deleted > 0 ? "{$deleted} user berhasil dihapus" : 'Tidak ada user yang dihapus',
            'description' => implode(' ', array_filter($parts, fn($p) => $p !== "{$deleted} user berhasil dihapus.")),
        ]);

        return redirect()->route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus akun sendiri.']);
        }

        if (! auth()->user()->hasRole('admin') && $user->hasRole('admin')) {
            return back()->withErrors(['error' => 'Tidak memiliki izin untuk menghapus akun admin.']);
        }

        try {
            activity('user')
                ->causedBy(auth()->user())
                ->withProperties(['name' => $user->name, 'nik' => $user->nik, 'role' => $user->getRoleNames()->first()])
                ->log("Menghapus user: {$user->name} ({$user->getRoleNames()->first()})");

            $user->delete();
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                Inertia::flash('toast', [
                    'type'        => 'error',
                    'message'     => 'User tidak dapat dihapus',
                    'description' => "Akun {$user->name} memiliki data P2H atau downtime yang terkait. Hapus atau arsipkan data tersebut terlebih dahulu.",
                ]);
                return redirect()->route('users.index');
            }
            throw $e;
        }

        Inertia::flash('toast', [
            'type'        => 'success',
            'message'     => 'User berhasil dihapus',
            'description' => "Akun {$user->name} dihapus dari sistem.",
        ]);

        return redirect()->route('users.index');
    }

    public function export(): BinaryFileResponse
    {
        $users = User::with(['roles', 'units'])->latest()->get();
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
            Log::warning('Import user selesai dengan error', [
                'user_id'     => auth()->id(),
                'success'     => $success,
                'error_count' => count($errors),
                'errors'      => $errors,
            ]);

            Inertia::flash('toast', [
                'type'        => 'warning',
                'message'     => "Import selesai dengan {$success} berhasil, " . count($errors) . ' gagal.',
                'description' => implode(' | ', array_slice($errors, 0, 3)) . (count($errors) > 3 ? '...' : ''),
            ]);
        } else {
            Inertia::flash('toast', [
                'type'        => 'success',
                'message'     => 'Import berhasil',
                'description' => "{$success} user berhasil ditambahkan.",
            ]);
        }

        return redirect()->route('users.index');
    }
}
