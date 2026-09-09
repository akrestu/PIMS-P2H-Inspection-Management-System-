<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\P2hSession;
use App\Models\Site;
use Illuminate\Database\Seeder;

class SiteSeeder extends Seeder
{
    public function run(): void
    {
        $fromSettings = AppSetting::get('job_sites', config('app.job_sites', ['PT. WBK Site MAS', 'PT. WBK Site BAU']));

        $fromHistoricalSessions = P2hSession::whereNotNull('job_site')
            ->where('job_site', '!=', '')
            ->distinct()
            ->pluck('job_site');

        $names = collect($fromSettings)
            ->merge($fromHistoricalSessions)
            ->map(fn ($n) => trim((string) $n))
            ->filter()
            ->unique()
            ->values();

        foreach ($names as $name) {
            Site::firstOrCreate(['name' => $name], ['status' => 'active']);
        }
    }
}
