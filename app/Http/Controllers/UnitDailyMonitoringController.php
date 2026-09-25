<?php

namespace App\Http\Controllers;

use App\Exports\DailyUnitMonitoringExport;
use App\Models\Site;
use App\Support\DailyUnitMonitoring;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Monitoring harian unit LV & Bus: P2H, temuan & tindak lanjut, KM, BBM (admin & manager). */
class UnitDailyMonitoringController extends Controller
{
    private const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        [$start, $end, $filters] = $this->filters($request);
        $data = DailyUnitMonitoring::build($start, $end, $filters);

        $page = LengthAwarePaginator::resolveCurrentPage();
        $rows = new LengthAwarePaginator(
            array_slice($data['rows'], ($page - 1) * self::PER_PAGE, self::PER_PAGE),
            count($data['rows']),
            self::PER_PAGE,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('unit-monitoring/index', [
            'rows' => $rows,
            'summary' => $data['summary'],
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                ...$filters,
            ],
            'sites' => Site::active()->orderBy('name')->get(['id', 'name']),
            'maxDays' => DailyUnitMonitoring::MAX_DAYS,
        ]);
    }

    public function excel(Request $request): BinaryFileResponse
    {
        [$start, $end, $filters] = $this->filters($request);
        $data = DailyUnitMonitoring::build($start, $end, $filters);

        return Excel::download(
            new DailyUnitMonitoringExport($data['rows'], $data['summary'], $start->toDateString(), $end->toDateString()),
            'monitoring-harian-unit_'.$start->format('Ymd').'_'.$end->format('Ymd').'.xlsx',
        );
    }

    /** @return array{0: Carbon, 1: Carbon, 2: array{site_id: ?int, jenis_unit: ?string, search: ?string, status: ?string}} */
    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date_format:Y-m-d'],
            'end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'jenis_unit' => ['nullable', 'in:Bus,Light Vehicle'],
            'search' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'in:terisi,kosong,temuan,bbm'],
        ]);

        // Default: awal bulan ini s/d hari ini
        $end = isset($validated['end']) ? Carbon::parse($validated['end']) : today();
        $start = isset($validated['start']) ? Carbon::parse($validated['start']) : $end->copy()->startOfMonth();

        if ($start->diffInDays($end) >= DailyUnitMonitoring::MAX_DAYS) {
            throw ValidationException::withMessages([
                'end' => 'Rentang monitoring harian maksimal '.DailyUnitMonitoring::MAX_DAYS.' hari.',
            ]);
        }

        return [$start, $end, [
            'site_id' => isset($validated['site_id']) ? (int) $validated['site_id'] : null,
            'jenis_unit' => $validated['jenis_unit'] ?? null,
            'search' => $validated['search'] ?? null,
            'status' => $validated['status'] ?? null,
        ]];
    }
}
