<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'log_name'   => 'nullable|in:user,unit,p2h',
            'search'     => 'nullable|string|max:100',
            'date_from'  => 'nullable|date_format:Y-m-d',
            'date_to'    => 'nullable|date_format:Y-m-d',
        ]);

        $logs = Activity::with('causer')
            ->when($request->log_name, fn ($q) => $q->inLog($request->log_name))
            ->when($request->search, fn ($q) => $q->where('description', 'like', "%{$request->search}%"))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn ($log) => [
                'id'          => $log->id,
                'log_name'    => $log->log_name,
                'description' => $log->description,
                'causer_name' => $log->causer?->name ?? 'System',
                'causer_role' => $log->causer?->getRoleNames()->first() ?? '-',
                'properties'  => $log->properties,
                'created_at'  => $log->created_at->setTimezone('Asia/Jakarta')->format('d/m/Y H:i:s'),
            ]);

        return Inertia::render('audit-log/index', [
            'logs'    => $logs,
            'filters' => $request->only(['log_name', 'search', 'date_from', 'date_to']),
        ]);
    }
}
