<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\Unit;
use App\Support\UnitUsageAnalytics;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UnitAnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date_format:Y-m-d'],
            'end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'jenis_unit' => ['nullable', 'string', 'max:50'],
        ]);

        $end = isset($validated['end']) ? Carbon::parse($validated['end']) : today();
        $start = isset($validated['start']) ? Carbon::parse($validated['start']) : $end->copy()->subDays(29);

        if ($start->diffInDays($end) > 365) {
            throw ValidationException::withMessages(['end' => 'Rentang analitik maksimal 1 tahun.']);
        }
        $siteId = isset($validated['site_id']) ? (int) $validated['site_id'] : null;
        $jenisUnit = $validated['jenis_unit'] ?? null;

        return Inertia::render('unit-analytics/index', [
            'fuel' => UnitUsageAnalytics::fuel($start, $end, $siteId, $jenisUnit),
            'service' => UnitUsageAnalytics::serviceForecast($siteId, $jenisUnit),
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'site_id' => $siteId,
                'jenis_unit' => $jenisUnit,
            ],
            'config' => [
                'interval_km' => config('p2h.service.interval_km'),
                'due_soon_km' => config('p2h.service.due_soon_km'),
                'wasteful_percent' => (int) (config('p2h.fuel.wasteful_ratio') * 100),
            ],
            'jenisOptions' => Unit::distinct()->orderBy('jenis_unit')->pluck('jenis_unit'),
            'sites' => Site::where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
