<?php

namespace App\Http\Controllers;

use App\Models\P2hSession;
use App\Support\HistoricalInspectionItems;
use App\Support\P2hFileStorage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class P2hExportController extends Controller
{
    public function exportPdf(P2hSession $session): Response
    {
        $this->authorize('view', $session);

        $user = request()->user();
        $entryScope = function ($query) use ($user) {
            if ($user->isStaffOnly()) {
                $query->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('pic_approver_id', $user->id));
            } elseif (! $user->isPrivileged()) {
                $query->where('user_id', $user->id);
            }
        };

        $session->load([
            'unit',
            'userEntries' => $entryScope,
            'userEntries.user',
            'userEntries.answers.inspectionItem',
            'userEntries.fuelLog',
            'userEntries.approver',
            'userEntries.pic',
            'serviceInfo',
        ]);

        $inspectionItems = HistoricalInspectionItems::fromEntries($session->userEntries);
        $session->userEntries->each(function ($entry) {
            $entry->setAttribute('driver_signature_path', P2hFileStorage::absolutePath($entry->paraf_url));
            $entry->setAttribute('approver_signature_path', P2hFileStorage::absolutePath($entry->approver_signature_url));
        });

        $pdf = Pdf::loadView('pdf.p2h_report', [
            'session' => $session,
            'inspectionItems' => $inspectionItems,
        ])->setPaper('a4', 'portrait');

        $filename = 'P2H_'.$session->unit->no_unit.'_'.$session->tanggal->format('Ymd').'.pdf';

        return $pdf->download($filename);
    }
}
