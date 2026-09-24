<?php

namespace App\Http\Controllers;

use App\Ai\Agents\P2hPeriodReportAgent;
use App\Models\Site;
use App\Models\Unit;
use App\Support\AiText;
use App\Support\PeriodP2hReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class P2hPeriodReportController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        [$filters, $report] = $this->report($request);

        return Inertia::render('p2h/period-report', [
            'report' => $report,
            'template' => PeriodP2hReport::toWhatsApp($report),
            'filters' => $filters,
            'jenisOptions' => Unit::distinct()->orderBy('jenis_unit')->pluck('jenis_unit'),
            'sites' => Site::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'aiEnabled' => AiText::enabled(),
        ]);
    }

    public function generateAi(Request $request): JsonResponse
    {
        [, $report] = $this->report($request);
        $analysis = AiText::generate(
            new P2hPeriodReportAgent,
            "Data laporan P2H periodik:\n".json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        );

        return P2hDailySummaryController::aiResponse(
            $analysis !== null ? PeriodP2hReport::toWhatsApp($report, $analysis) : null,
            PeriodP2hReport::toWhatsApp($report),
        );
    }

    public function pdf(Request $request): Response
    {
        [, $report] = $this->report($request);

        return Pdf::loadView('pdf.p2h_period_report', ['report' => $report])
            ->setPaper('a4')
            ->download('periodic-report-p2h-'.$report['periode']['mulai'].'-'.$report['periode']['selesai'].'.pdf');
    }

    /** @return array{0: array, 1: array} */
    private function report(Request $request): array
    {
        $validated = $request->validate([
            'period' => ['nullable', 'in:this_week,last_week,this_month,last_month,custom'],
            'start' => ['nullable', 'required_if:period,custom', 'date_format:Y-m-d', 'before_or_equal:today'],
            'end' => ['nullable', 'required_if:period,custom', 'date_format:Y-m-d', 'after_or_equal:start', 'before_or_equal:today'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'jenis_unit' => ['nullable', 'string', 'max:50'],
        ]);

        $period = $validated['period'] ?? 'this_week';
        [$start, $end] = PeriodP2hReport::resolvePeriod($period, $validated['start'] ?? null, $validated['end'] ?? null);
        $siteId = isset($validated['site_id']) ? (int) $validated['site_id'] : null;
        $jenisUnit = $validated['jenis_unit'] ?? null;

        return [
            [
                'period' => $period,
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'site_id' => $siteId,
                'jenis_unit' => $jenisUnit,
            ],
            PeriodP2hReport::build($start, $end, $siteId, $jenisUnit),
        ];
    }
}
