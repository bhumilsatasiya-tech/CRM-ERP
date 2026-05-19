<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Settings\Http\Resources\AuditLogResource;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('audit.view'), 403, 'Forbidden');

        $perPage = max(1, min((int) $request->input('per_page', 25), 100));

        $page = Activity::query()
            ->with('causer')
            ->when($request->filled('log_name'),     fn($q) => $q->where('log_name', $request->string('log_name')))
            ->when($request->filled('event'),        fn($q) => $q->where('event', $request->string('event')))
            ->when($request->filled('subject_type'), fn($q) => $q->where('subject_type', $request->string('subject_type')))
            ->when($request->filled('subject_id'),   fn($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('causer_id'),    fn($q) => $q->where('causer_id', $request->integer('causer_id')))
            ->when($request->filled('from'), fn($q) => $q->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'),   fn($q) => $q->whereDate('created_at', '<=', $request->date('to')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($qq) use ($term) {
                    $qq->where('description', 'like', $term)->orWhere('log_name', 'like', $term);
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return AuditLogResource::collection($page);
    }

    public function show(Request $request, int $id): AuditLogResource
    {
        abort_unless($request->user()?->can('audit.view'), 403, 'Forbidden');
        $log = Activity::with('causer')->findOrFail($id);
        return new AuditLogResource($log);
    }
}
