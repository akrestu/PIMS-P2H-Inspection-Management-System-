<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('settings/app', [
            'settings' => [
                'shifts' => AppSetting::shifts(),
                'unit_analytics' => AppSetting::unitAnalyticsEnabled(),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'shifts' => ['required', 'array', 'min:1', 'max:2'],
            'shifts.*' => ['required', 'string', 'distinct', Rule::in(AppSetting::SUPPORTED_SHIFTS)],
            'unit_analytics' => ['boolean'],
        ]);

        AppSetting::set('shifts', $validated['shifts']);
        AppSetting::set('unit_analytics_enabled', (bool) ($validated['unit_analytics'] ?? false));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengaturan aplikasi berhasil disimpan',
        ]);

        return redirect()->route('app-settings.index');
    }
}
