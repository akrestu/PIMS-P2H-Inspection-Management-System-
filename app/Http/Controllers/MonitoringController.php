<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Support\PaWeekly;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'jenis_unit' => 'nullable|in:Bus,Light Vehicle',
            'sampai' => 'nullable|date_format:Y-m-d|before_or_equal:today',
        ]);

        $authUser = $request->user();

        // Driver User LV 1 tidak diizinkan
        abort_unless($authUser->canViewMonitoring(), 403);

        $jenis = $request->input('jenis_unit');

        $allUnits = Unit::active()
            ->orderBy('no_unit')
            // Approval/User LV 2 murni hanya lihat LV dept mereka
            ->when($authUser->isStaffOnly(), fn ($q) => $q->monitorableBy($authUser))
            ->get(['id', 'no_unit', 'jenis_unit']);

        // Tampilan mingguan (PA-Desktop.png): 7 hari berakhir di ?sampai= (default hari ini)
        $weekly = PaWeekly::build(
            Carbon::parse($request->input('sampai', today()->toDateString())),
            ['jenis_unit' => $jenis],
            $authUser,
        );

        return Inertia::render('monitoring/index', [
            'weekly' => $weekly,
            'filters' => [
                'jenis_unit' => $jenis,
            ],
            'allUnits' => $allUnits,
        ]);
    }
}
