<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSiteRequest;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SiteController extends Controller
{
    public function index(Request $request): Response
    {
        $sites = Site::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->withCount(['units', 'users'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $stats = [
            'total' => Site::count(),
            'active' => Site::where('status', 'active')->count(),
            'inactive' => Site::where('status', 'inactive')->count(),
        ];

        return Inertia::render('sites/index', [
            'sites' => $sites,
            'filters' => $request->only(['search', 'status']),
            'stats' => $stats,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sites/form');
    }

    public function store(StoreSiteRequest $request): RedirectResponse
    {
        $site = Site::create($request->validated());

        activity('site')
            ->causedBy(auth()->user())
            ->performedOn($site)
            ->log("Menambahkan site: {$site->name}");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Site berhasil ditambahkan',
            'description' => "Site {$site->name} telah terdaftar dalam sistem.",
        ]);

        return redirect()->route('sites.index');
    }

    public function edit(Site $site): Response
    {
        return Inertia::render('sites/form', ['site' => $site]);
    }

    public function update(StoreSiteRequest $request, Site $site): RedirectResponse
    {
        $site->update($request->validated());

        activity('site')
            ->causedBy(auth()->user())
            ->performedOn($site)
            ->log("Memperbarui site: {$site->name}");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Site berhasil diperbarui',
            'description' => "Data site {$site->name} telah disimpan.",
        ]);

        return redirect()->route('sites.index');
    }

    public function destroy(Site $site): RedirectResponse
    {
        $name = $site->name;
        $unitCount = $site->units()->count();
        $userCount = $site->users()->count();

        if ($unitCount > 0 || $userCount > 0) {
            return back()->withErrors([
                'site' => "Site masih digunakan oleh {$unitCount} unit dan {$userCount} user. Pindahkan relasinya sebelum menghapus site.",
            ]);
        }

        activity('site')
            ->causedBy(auth()->user())
            ->withProperties(['name' => $name])
            ->log("Menghapus site: {$name}");

        $site->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Site berhasil dihapus',
            'description' => "Site {$name} telah dipindahkan ke sampah dan dapat dipulihkan kembali.",
        ]);

        return redirect()->route('sites.index');
    }

    public function destroyBatch(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:sites,id',
        ]);

        $sites = Site::whereIn('id', $request->ids)->get();
        $deleted = 0;
        $skipped = 0;

        foreach ($sites as $site) {
            if ($site->units()->exists() || $site->users()->exists()) {
                $skipped++;

                continue;
            }

            activity('site')
                ->causedBy(auth()->user())
                ->withProperties(['name' => $site->name])
                ->log("Menghapus site (batch): {$site->name}");

            $site->delete();
            $deleted++;
        }

        Inertia::flash('toast', [
            'type' => $skipped > 0 ? 'warning' : 'success',
            'message' => "{$deleted} site berhasil dihapus",
            'description' => $skipped > 0
                ? "{$skipped} site dilewati karena masih digunakan unit atau user."
                : 'Site yang dipilih telah dipindahkan ke sampah dan dapat dipulihkan kembali.',
        ]);

        return redirect()->route('sites.index');
    }

    public function trashed(Request $request): Response
    {
        $sites = Site::onlyTrashed()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->orderByDesc('deleted_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('sites/trashed', [
            'sites' => $sites,
            'filters' => $request->only(['search']),
        ]);
    }

    public function restore(int $id): RedirectResponse
    {
        $site = Site::onlyTrashed()->findOrFail($id);
        $name = $site->name;

        $site->restore();

        activity('site')
            ->causedBy(auth()->user())
            ->performedOn($site)
            ->log("Memulihkan site: {$name}");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Site berhasil dipulihkan',
            'description' => "Site {$name} telah dikembalikan ke daftar site aktif.",
        ]);

        return redirect()->route('sites.trashed');
    }

    public function forceDestroy(int $id): RedirectResponse
    {
        $site = Site::withTrashed()->findOrFail($id);
        $name = $site->name;

        $unitCount = Unit::withTrashed()->where('site_id', $site->id)->count();
        $userCount = User::where('site_id', $site->id)->count();

        if ($unitCount > 0 || $userCount > 0) {
            return back()->withErrors([
                'site' => "Site masih digunakan oleh {$unitCount} unit dan {$userCount} user. Pindahkan relasinya sebelum menghapus permanen.",
            ]);
        }

        $site->forceDelete();

        activity('site')
            ->causedBy(auth()->user())
            ->withProperties(['name' => $name])
            ->log("Menghapus permanen site: {$name}");

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Site dihapus permanen',
            'description' => "Site {$name} telah dihapus permanen dari sistem.",
        ]);

        return redirect()->route('sites.trashed');
    }
}
