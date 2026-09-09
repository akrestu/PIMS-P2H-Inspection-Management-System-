<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('settings/app', [
            'settings' => [
                'shifts' => AppSetting::get('shifts', ['Shift I', 'Shift II']),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'shifts'   => ['required', 'array', 'min:1'],
            'shifts.*' => ['required', 'string', 'max:50'],
        ]);

        AppSetting::set('shifts', $validated['shifts']);

        Inertia::flash('toast', [
            'type'    => 'success',
            'message' => 'Pengaturan aplikasi berhasil disimpan',
        ]);

        return redirect()->route('app-settings.index');
    }
}
