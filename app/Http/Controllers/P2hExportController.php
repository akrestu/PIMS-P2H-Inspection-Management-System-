<?php

namespace App\Http\Controllers;

use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class P2hExportController extends Controller
{
    public function exportPdf(P2hSession $session): Response
    {
        $this->authorize('view', $session);

        $session->load([
            'unit',
            'userEntries.user.driver',
            'userEntries.answers.inspectionItem',
            'userEntries.fuelLog',
            'serviceInfo',
        ]);

        $inspectionItems = P2hInspectionItem::active()->ordered()->get();

        $pdf = Pdf::loadView('pdf.p2h_report', [
            'session'         => $session,
            'inspectionItems' => $inspectionItems,
        ])->setPaper('a4', 'portrait');

        $filename = 'P2H_' . $session->unit->no_unit . '_' . $session->tanggal->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
