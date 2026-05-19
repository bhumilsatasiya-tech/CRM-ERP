<?php

namespace Modules\Auth\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Controllers\Controller;
use Modules\Auth\Http\Resources\PermissionResource;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('permission.view'), 403, 'Forbidden');

        $perms = Permission::query()
            ->where('guard_name', 'api')
            ->when($request->filled('module'), fn($q) => $q->where('module', $request->string('module')))
            ->when($request->filled('search'), fn($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->orderBy('module')->orderBy('name')
            ->get();

        return PermissionResource::collection($perms);
    }
}
