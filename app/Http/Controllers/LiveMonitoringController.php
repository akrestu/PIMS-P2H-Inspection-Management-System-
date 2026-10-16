<?php

namespace App\Http\Controllers;

use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Unit;
use App\Notifications\P2hDriverReminder;
use App\Support\TodayP2hStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Monitoring P2H hari ini (pims-redesign/docs/screens/manager-ops.md · Monitoring-Desktop.png):
 * status P2H per unit untuk hari berjalan + feed aktivitas terbaru. Hanya membaca data.
 */
class LiveMonitoringController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->canViewMonitoring(), 403);

        $units = Unit::active()
            ->when($user->isStaffOnly(), fn ($q) => $q->monitorableBy($user))
            ->with('users:id,name')
            ->orderBy('no_unit')
            ->get();

        return Inertia::render('monitoring-p2h/index', [
            'today' => TodayP2hStatus::build(today(), $units),
            'feed' => $this->feed($units->pluck('id')),
            'updatedAt' => now()->toIso8601String(),
        ]);
    }

    /**
     * Tombol "Ingatkan" (Dashboard / Monitoring P2H): kirim notifikasi aplikasi ke
     * driver yang DITUGASKAN ke unit yang belum P2H hari ini. Driver yang sudah
     * diingatkan untuk unit yang sama dalam 30 menit terakhir dilewati.
     */
    public function remind(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canViewMonitoring(), 403);

        $data = $request->validate([
            'unit_ids' => ['required', 'array', 'min:1', 'max:200'],
            'unit_ids.*' => ['integer'],
        ]);

        $units = Unit::active()
            ->when($user->isStaffOnly(), fn ($q) => $q->monitorableBy($user))
            ->whereIn('id', $data['unit_ids'])
            ->with('users:id,name')
            ->get();

        // Hanya unit yang memang belum P2H hari ini
        $done = P2hSession::whereDate('tanggal', today())
            ->whereIn('unit_id', $units->pluck('id'))
            ->whereHas('userEntries', fn ($q) => $q->notRejected())
            ->pluck('unit_id');

        $sent = 0;
        $reminded = [];
        foreach ($units->whereNotIn('id', $done) as $unit) {
            foreach ($unit->users as $driver) {
                $recent = $driver->notifications()
                    ->where('created_at', '>=', now()->subMinutes(30))
                    ->where('data', 'like', '%"type":"p2h_reminder"%')
                    ->where('data', 'like', '%"unit_id":'.$unit->id.',%')
                    ->exists();

                if ($recent) {
                    continue;
                }

                $driver->notify(new P2hDriverReminder($unit, $user->name));
                $sent++;
                $reminded[] = $unit->no_unit;
            }
        }

        $reminded = array_values(array_unique($reminded));

        if ($sent > 0) {
            activity('p2h')->causedBy($user)
                ->withProperties(['units' => $reminded, 'driver' => $sent])
                ->log('Mengingatkan driver belum P2H: '.implode(', ', $reminded));
        }

        Inertia::flash('toast', $sent > 0
            ? ['type' => 'success', 'message' => "Pengingat terkirim ke {$sent} driver", 'description' => implode(', ', $reminded)]
            : ['type' => 'info', 'message' => 'Tidak ada pengingat baru', 'description' => 'Unit sudah P2H, belum punya driver ditugaskan, atau baru saja diingatkan.']);

        return back();
    }

    /**
     * Aktivitas hari ini, terbaru di atas: P2H masuk, BD otomatis, disetujui, ditolak.
     *
     * @return list<array{type: string, no_unit: string, text: string, at: string, time: string}>
     */
    private function feed(Collection $unitIds): array
    {
        $entries = P2hUserEntry::query()
            ->whereHas('session', fn ($q) => $q->whereDate('tanggal', today())->whereIn('unit_id', $unitIds))
            ->with(['session.unit:id,no_unit', 'user:id,name', 'approver:id,name'])
            ->withCount(['answers as tidak_layak' => fn ($a) => $a->where('kondisi', 'Tidak Layak')])
            ->get();

        $events = collect();

        foreach ($entries as $entry) {
            $unit = $entry->session?->unit?->no_unit;
            if (! $unit || ! $entry->submitted_at) {
                continue;
            }

            $events->push([
                'type' => $entry->kondisi_akhir === 'BD' ? 'bd' : ($entry->tidak_layak > 0 ? 'rusak' : 'masuk'),
                'no_unit' => $unit,
                'text' => $entry->kondisi_akhir === 'BD'
                    ? 'Tidak layak → BD otomatis'
                    : 'P2H masuk · '.($entry->user?->name ?? '—').($entry->tidak_layak > 0 ? " · {$entry->tidak_layak} rusak" : ''),
                'at' => $entry->submitted_at->toIso8601String(),
                'time' => $entry->submitted_at->format('H:i'),
            ]);

            if ($entry->approved_at && in_array($entry->approval_status, ['approved', 'rejected'], true)) {
                $events->push([
                    'type' => $entry->approval_status === 'approved' ? 'disetujui' : 'ditolak',
                    'no_unit' => $unit,
                    'text' => ($entry->approval_status === 'approved' ? 'P2H disetujui ' : 'P2H ditolak ').($entry->approver?->name ?? ''),
                    'at' => $entry->approved_at->toIso8601String(),
                    'time' => $entry->approved_at->format('H:i'),
                ]);
            }
        }

        return $events->sortByDesc('at')->take(12)->values()->all();
    }
}
