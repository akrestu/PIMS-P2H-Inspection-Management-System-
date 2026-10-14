<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Support\FleetAvailability;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to' => 'nullable|date_format:Y-m-d',
            'unit_id' => 'nullable|integer|exists:units,id',
            'jenis_unit' => 'nullable|in:Bus,Light Vehicle',
        ]);

        $authUser = $request->user();

        // Driver User LV 1 tidak diizinkan
        abort_unless($authUser->canViewMonitoring(), 403);

        $from = Carbon::parse($request->input('date_from', now()->startOfMonth()->toDateString()));
        $to = Carbon::parse($request->input('date_to', now()->toDateString()));
        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }
        // Clamp max range ke 90 hari
        if ($from->diffInDays($to) > 90) {
            $from = $to->copy()->subDays(89);
        }

        $unitId = $request->input('unit_id');
        $jenis = $request->input('jenis_unit');

        $result = FleetAvailability::build($from, $to, [
            'unit_id' => $unitId,
            'jenis_unit' => $jenis,
        ], $authUser);

        $allUnits = Unit::active()
            ->orderBy('no_unit')
            // Approval/User LV 2 murni hanya lihat LV dept mereka
            ->when($authUser->isStaffOnly(), fn ($q) => $q->monitorableBy($authUser))
            ->get(['id', 'no_unit', 'jenis_unit']);

        return Inertia::render('monitoring/index', [
            'unitData' => $result['units'],
            'summary' => $result['summary'],
            'filters' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'unit_id' => $unitId,
                'jenis_unit' => $jenis,
            ],
            'allUnits' => $allUnits,
        ]);
    }
}
