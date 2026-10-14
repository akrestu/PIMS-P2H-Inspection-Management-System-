<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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
                'public_report_url' => AppSetting::publicReportUrl(),
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

    /** Aktifkan, ganti (link lama tidak berlaku), atau nonaktifkan link rekap publik. */
    public function publicLink(Request $request): RedirectResponse
    {
        $action = $request->validate(['action' => ['required', 'in:enable,regenerate,disable']])['action'];

        AppSetting::set('public_report_token', $action === 'disable' ? null : Str::random(40));

        activity('settings')->causedBy($request->user())->log(match ($action) {
            'enable' => 'Mengaktifkan link rekap P2H publik',
            'regenerate' => 'Mengganti link rekap P2H publik',
            'disable' => 'Menonaktifkan link rekap P2H publik',
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $action === 'disable' ? 'Link rekap publik dinonaktifkan' : 'Link rekap publik siap dibagikan',
        ]);

        return redirect()->route('app-settings.index');
    }
}
