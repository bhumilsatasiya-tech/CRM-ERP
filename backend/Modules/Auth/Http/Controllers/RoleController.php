<?php

namespace Modules\Auth\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Controllers\Controller;
use Modules\Auth\Http\Requests\StoreRoleRequest;
use Modules\Auth\Http\Requests\UpdateRoleRequest;
use Modules\Auth\Http\Resources\RoleResource;
use Modules\Auth\Services\RoleService;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private RoleService $roleService)
    {
        $this->authorizeResource(Role::class, 'role');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->roleService->paginate($request->only(['search', 'per_page']));
        return RoleResource::collection($page);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roleService->create($request->validated());
        return (new RoleResource($role))->response()->setStatusCode(201);
    }

    public function show(Role $role): RoleResource
    {
        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $updated = $this->roleService->update($role, $request->validated());
        return new RoleResource($updated);
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->roleService->delete($role);
        return response()->json(['data' => ['message' => 'Role deleted.']]);
    }
}
