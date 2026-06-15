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
                'job_sites' => AppSetting::get('job_sites', config('app.job_sites', ['PT. WBK Site MAS', 'PT. WBK Site BAU'])),
                'shifts'    => AppSetting::get('shifts', ['Shift I', 'Shift II']),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'job_sites'   => ['required', 'array', 'min:1'],
            'job_sites.*' => ['required', 'string', 'max:100'],
            'shifts'      => ['required', 'array', 'min:1'],
            'shifts.*'    => ['required', 'string', 'max:50'],
        ]);

        AppSetting::set('job_sites', $validated['job_sites']);
        AppSetting::set('shifts', $validated['shifts']);

        Inertia::flash('toast', [
            'type'    => 'success',
            'message' => 'Pengaturan aplikasi berhasil disimpan',
        ]);

        return redirect()->route('app-settings.index');
    }
}
